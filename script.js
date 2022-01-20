function setTrigger() {
  const time = new Date();
  time.setHours(9);
  time.setMinutes(30);
  ScriptApp.newTrigger('myFunction').timeBased().at(time).create();
}

function myFunction() {
  // メンバー情報を取得
  if(isWorkDayFix()){
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('メンバー表');
    const members = sheet.getRange('C3:C15').getValues();

    // ランダムにメンバーを選定
    // 連日同じ人に重ならないようにした方が良さそう
    let filterdMember = []
    const savedMember = fetchMember();
    if(savedMember == null){
      filterdMember = members
    }else {
      filterdMember = members.filter(member => savedMember.indexOf(member) == -1);
    }
    
    if(filterdMember.length < 2){
      filterdMember = members
      const properties = PropertiesService.getScriptProperties();
      properties.deleteProperty('Members');
    }
    const selectedMembers = randomSelect(filterdMember.slice(),2);

    // Sentryに通知
    slackNotification(selectedMembers);

    saveMember(selectedMembers);
  }
}

function randomSelect(array,num) {
  let newArray = [];
  
  while(newArray.length < num && array.length > 0)
  {
    // 配列からランダムな要素を選ぶ
    const rand = Math.floor(Math.random() * array.length);
    // 選んだ要素を別の配列に登録する
    newArray.push(array[rand]);
    // もとの配列からは削除する
    array.splice(rand, 1);
  }
  
  return newArray;  
}

function slackNotification(selectedMember) {
  const members = selectedMember
  const webhookUrl = 'https://hooks.slack.com/services/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'
  const messageText = 
  `本日のShuffle 1on1は <@${members[0]}>さんと<@${members[1]}>さんです！\n
  お時間になりましたら、Google Meetからご参加をお願いいたします！`


  const options = 
  {
    "method" : "post",
    "contentType" : "application/json",
    "payload" : JSON.stringify(
      {
        "text" : messageText,
        link_names: 1
      }
    )
  };
  //投稿先
  UrlFetchApp.fetch(webhookUrl, options);
  return
}

function saveMember(selectedMembers) {
  // 一週間で同じ人が当たらないよう登録しておく

  const todayMemberArr = selectedMembers;
  const properties = PropertiesService.getScriptProperties();

  let saveMemberStr = properties.getProperty('Members');
  if(saveMemberStr == null){ 
    properties.setProperty('Members', todayMemberArr.join(','));
    return
  };

  const newMemberArr = saveMemberStr.split(',').concat(todayMemberArr);
  properties.setProperty('Members', newMemberArr.join(','));
  return
}

function fetchMember() {
  const properties = PropertiesService.getScriptProperties();
  return properties.getProperty('Members');
}

function deleteMember() {
    const properties = PropertiesService.getScriptProperties();
    properties.deleteProperty('Members') 
}

// 祝日なら実行しない制御
// 土日祝日なら実行しない制御
function isWorkDayFix() {
  let today = new Date();
  let weekInt = today.getDay();

  //土日か判定
  if(weekInt <= 0 || 6 <= weekInt){
    const properties = PropertiesService.getScriptProperties();
    properties.deleteProperty('Members')
    return false;
  }

  //祝日か判定
  let calendarId = "ja.japanese#holiday@group.v.calendar.google.com";
  let calendar = CalendarApp.getCalendarById(calendarId);
  let todayEvents = calendar.getEventsForDay(today);
  if(todayEvents.length > 0){
    return false;
  }

  return true;
  
}
