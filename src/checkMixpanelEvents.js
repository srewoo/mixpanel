const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const axios = require('axios');
const fs = require('fs');
const { eventList } = require('../src/eventList'); 

// Mixpanel API credentials from .env file
const projectId = process.env.MIXPANEL_PROJECT_ID;

if (!projectId) {
  console.error('Missing MIXPANEL_PROJECT_ID. Check your .env file.');
  process.exit(1);
}

// Function to make a request to Mixpanel using the curl command details
async function fetchEventsFromMixpanel() {
  try {
    const credentials = process.env.MIXPANEL_KEY;  

    const response = await axios({
      method: 'POST',
      url: 'https://mixpanel.com/api/query/stream/bookmark',
      headers: {
        'accept': '*/*',
        'authorization': `Basic ${credentials}`,
        'content-type': 'text/plain;charset=UTF-8',
        'project-id': projectId
      },
      data: {
        "bookmark": {
          "entries": [
            {
              "aggregationOperator": "total",
              "event": {
                "label": "All Events",
                "value": "$all_events"
              },
              "filters": [],
              "filtersOperator": "and",
              "type": "event"
            }
          ],
          "filters": [],
          "dateRange": {
            "type": "in the last",
            "window": {
              "unit": "day",
              "value": 7
            }
          }
        },
        "project_id": projectId,
        "limit": 1000,
        "paging_window": 30
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching Mixpanel events:', {
      message: error.message,
      status: error.response ? error.response.status : 'N/A',
      data: error.response ? error.response.data : 'N/A',
    });
    throw error;
  }
}

// Function to check events and write results to CSV
async function checkEventsAndWriteCSV() {
  try {
    const mixpanelResponse = await fetchEventsFromMixpanel();

    // Access the events in response.json.results.events[*].event
    const events = mixpanelResponse?.results?.events || [];

    if (!events || events.length === 0) {
      console.log(`No events found for project ${projectId}`);
      return;
    }

    const csvHeader = "Event Name,Number of Events,Properties\n";
    let csvContent = '';

    // Check if the event is in eventList and collect its details
    eventList.forEach(eventFromList => {
      const matchedEvents = events.filter(e => e.event === eventFromList);

      matchedEvents.forEach(event => {
        // Get the event's properties
        const eventProperties = event.properties ? JSON.stringify(event.properties) : ''; 
        csvContent += `${eventFromList},${matchedEvents.length},"${eventProperties}"\n`;  
      });
    });

    // Write the results to the CSV file
    fs.writeFileSync('testResults.csv', csvHeader + csvContent, 'utf8');
    console.log('Results written to testResults.csv');
  } catch (error) {
    console.error('An error occurred while checking events:', error);
  }
}

// Call the function to check events and write to CSV
checkEventsAndWriteCSV()
  .then(() => {
    console.log('Event check completed.');
  })
  .catch((error) => {
    console.error('An error occurred:', error);
  });
