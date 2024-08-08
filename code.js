const SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'; // Replace with your Slack webhook URL
const CALENDAR_ID = 'your_calendar_id@group.calendar.google.com'; // Replace with your calendar ID

// 🎯 Sending Notifications to Slack
function sendSlackNotification(message) {
  const payload = {
    text: message,
    link_names: 1, // ✅Tips: Ensures that @mentions are recognized by Slack
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
  };

  UrlFetchApp.fetch(SLACK_WEBHOOK_URL, options);
}

// 🎯 Post daily events 
function postDailyEvents() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const events = CalendarApp.getCalendarById(CALENDAR_ID).getEvents(today, tomorrow);

  let messageHeader =  ':spiral_calendar_pad: *今日の予定を共有します:*\n\n'
  let message = messageHeader;
  let postedEvents = [];

  events.forEach(event => {
    const eventId = event.getId();
    const startTime = event.getStartTime().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTime = event.getEndTime().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    message += `▸ *${event.getTitle()}*: \n     時間：(${startTime} ~ ${endTime})\n`;

    // Add event details to postedEvents array
    postedEvents.push({ id: eventId, startTime, endTime });
  });

  // Send a message if there are events
  if (message !== messageHeader) {
    message += `\n 本日もよろしくお願いします！`
    sendSlackNotification(message);
  } else {
    Logger.log('There are no events for today.');
  }

  // Store the posted event details to avoid duplicate posting of the same event by checkNewCalendarEvents()
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty('postedEvents', JSON.stringify(postedEvents));
}

// 1. 🎯  Post newly created events for today 
// 2. 🎯  Post today's events when their start/end time gets updated
function checkNewCalendarEvents() {
   // Access the script properties service to store and retrieve persistent key-value pairs.
  const properties = PropertiesService.getScriptProperties(); 
  // Retrieve the posted events from the previous runs or initialize an empty array if none are found.
  const postedEvents = JSON.parse(properties.getProperty('postedEvents') || '[]');  
  // Get the last checked time or use the current time if not found.
  const lastChecked = new Date(properties.getProperty('lastChecked') || new Date().getTime());  

  const now = new Date();  
  // Create a new Date object representing the start of today.
  const startOfToday = new Date(now); 
  // Set the time of the startOfToday to midnight (00:00:00). 
  startOfToday.setHours(0, 0, 0, 0);  
  // Create a new Date object representing the start of tomorrow.
  const startOfTomorrow = new Date(startOfToday);  
  // Move the date to the next day.
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);  

  // Retrieve events from the calendar for today.
  const events = CalendarApp.getCalendarById(CALENDAR_ID).getEvents(startOfToday, startOfTomorrow); 

  // Initialize an array to store the current events.
  let newPostedEvents = [];  
  
  events.forEach(event => {  
    const eventId = event.getId();  
    // Get the start time of the event in a readable format. Remove milliseconds and only display hours and minutes
    const startTime = event.getStartTime().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTime = event.getEndTime().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    // Check if the event already exists in the posted events.
    const existingEvent = postedEvents.find(e => e.id === eventId);  

    if (existingEvent) {  // If the event exists in the posted events:
      // Check if event start or end time has changed
      if (existingEvent.startTime !== startTime || existingEvent.endTime !== endTime) { 
        // Create a message indicating the event time has changed.
        const message = `@channel \n\n :pencil: *本日の予定の時間が変更されました:* \n  ▸ *${event.getTitle()}* \n        時間：(${startTime} ~ ${endTime})`;  
        sendSlackNotification(message); 
      }
    } else {  // If the event does not exist in the posted events:
    // Create a message indicating a new event has been added.
      const message = `@channel \n\n :new_1: *本日の新しい予定が追加されました:* \n  ▸ *${event.getTitle()}* \n        時間：(${startTime} ~ ${endTime})`;  
      sendSlackNotification(message);  
    }

    // Add the current event details to the new posted events array.
    newPostedEvents.push({ id: eventId, startTime, endTime });  
  });

  // Update the posted events property with the new posted events array to avoid duplicate posting of the same event by checkNewCalendarEvents() when the calendar updates
  properties.setProperty('postedEvents', JSON.stringify(newPostedEvents));  
  // Update the last checked time with the current time.
  properties.setProperty('lastChecked', now.getTime());  
}

// 🛠️ Check the state of posted events. 
// Use it manually to debug and verify the events that have been posted.
function checkProperties() {
  const properties = PropertiesService.getScriptProperties();
  const postedEvents = JSON.parse(properties.getProperty('postedEvents'));  

  Logger.log(`Posted events: ${postedEvents}`);
}

// 🛠️ Clears the 'postedEvents' property from script properties.
// Use it manually to reset the state if you need to start fresh, ensuring that no previous events are posted and thus avoiding potential duplication in notifications.
function clearChannelProperties() {
  const properties = PropertiesService.getScriptProperties();
  properties.deleteProperty('postedEvents');

  Logger.log('Channel properties cleared.');
}
