# SWA-Scraper

This project is based on, and uses some code from <a href="https://github.com/gilby125/swa-dashboard">https://github.com/gilby125/swa-dashboard</a>

This app lets you monitor Southwest Airlines for your flight's price and notifies you via a text message when the prices fall below a threshold. You will need a Twilio account to send text messages. You can create a free trial account <a href="https://www.twilio.com/">here</a>.

## Running locally
To run app locally, update the ```localConfig.json``` file with your Twilio credentials, and your flight details. The app will search for your flight every ${threshold} minutes, and if your Twilio credentials are valid, you will recieve a text message when either the outbound or return ticket price falls below the threshold you set. You will get a text only if the new ticket price is lower than the threshold AND lower than the previous value.

For example,

```
{
  "development": {
    "accountSid": "ACc8af435h34jh5g14hg66b341kjhab29ae",
    "authToken": "ce48c141d2234jb523468b6a329c10",
    "toPhoneNumber": "+19251231234",
    "fromPhoneNumber": "+19253214321",
    "originAirport": "SFO",
    "destinationAirport": "LAX",
    "outboundDateString": "11/22/2017",
    "returnDateString": "11/26/2017",
    "adultPassengerCount": "1",
    "threshold": 300,
    "interval": 60
  }
}
```

Run the following command to install the dependencies.
```
npm install
```

Run the following command to start a local server.

```
node app.js
```

The app will run on <a href="http://localhost:5000">localhost:5000</a>. You can always find the latest price for your flight here, instead of going to Southwest's website. You will have to keep the machine running the server on if you want to continue receiving notifications.

## Deploying to CloudFoundry
If you have CloudFoundry instance, you can deploy the app there, instead of keepng your machine running. 

Before you push the app, update the `manifest.yml` file with your Twilio credentials, and your flight details.

For example, this is how your manifest.yml file should look:

```
---
applications:
  - name: swa-scraper
    memory: 128M
    timeout: 180
    buildpack: nodejs_buildpack
    command: node app.js
    path: .
env:
    node_env: cloud
    accountSid: ACc8af435h34jh5g14hg66b341kjhab29ae
    authToken: ce48c141d2234jb523468b6a329c10
    toPhoneNumber: +19251231234
    fromPhoneNumber: +19253214321
    originAirport: SFO
    destinationAirport: LAX
    outboundDateString: 11/22/2017
    returnDateString: 11/26/2017
    adultPassengerCount: 1
    threshold: 300
    interval: 60
```

Run the following command to push the app to CloudFoundry
```
cf push
```

**Note**: If you get an error starting the app on the cloud, delete the node_modules directory before you push.
