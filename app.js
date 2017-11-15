const http = require('http');
const express = require('express');
const osmosis = require('osmosis');

const app = express();
const httpServer = http.createServer(app);

const node_env = process.env.node_env || 'development';
if(node_env === "development"){
  var devConfig = require('./localConfig.json')[node_env];
}

const originAirport = process.env.originAirport || devConfig.originAirport;
const destinationAirport = process.env.destinationAirport || devConfig.destinationAirport;
const outboundDateString = process.env.outboundDateString || devConfig.outboundDateString;
const returnDateString = process.env.returnDateString || devConfig.returnDateString;
const adultPassengerCount = process.env.adultPassengerCount || devConfig.adultPassengerCount;
const threshold = process.env.threshold || devConfig.threshold;
const interval = process.env.interval || devConfig.interval;
const fares = {
    outbound: [],
    return: []
}

var lowestOutgoingFare = -1;
var lowestReturnFare = -1;
var isTwilioConfigured = true;
var lastUpdated = "";

const accountSid = process.env.accountSid || devConfig.accountSid;
const authToken = process.env.authToken || devConfig.authToken;
var client;
try{
    client = require('twilio')(accountSid, authToken);
}catch(e){
    isTwilioConfigured = false;
    console.log("Twilio is not configured. Cannot send text messages");
}


const getTicketPrices = () => {
    osmosis
    .get("https://www.southwest.com")
    .submit(".booking-form--form", {
        twoWayTrip: true,
        airTranRedirect: "",
        returnAirport: "RoundTrip",
        outboundTimeOfDay: "ANYTIME",
        returnTimeOfDay: "ANYTIME",
        seniorPassengerCount: 0,
        fareType: "DOLLARS",
        originAirport,
        destinationAirport,
        outboundDateString,
        returnDateString,
        adultPassengerCount
    })
    .find("#faresOutbound .product_price")
    .then((priceMarkup) => {
        const matches = priceMarkup.toString().match(/\$.*?(\d+)/);
        const price = parseInt(matches[1]);
        fares.outbound.push(price);
    })
    .find("#faresReturn .product_price")
    .then((priceMarkup) => {
        const matches = priceMarkup.toString().match(/\$.*?(\d+)/);
        const price = parseInt(matches[1]);
        fares.return.push(price);
    })
    .done(() => {
        const newLowestOutgoingFare = Math.min(...fares.outbound);
        const newLowestRetunFare = Math.min(...fares.return);
        if(lowestOutgoingFare === -1){
            console.log(`*******************************************\n`)
            console.log("Initialising prices")
            lowestOutgoingFare = newLowestOutgoingFare;
            lowestReturnFare = newLowestRetunFare;
            lastUpdated = Date.now();
            console.log(`threshold = ${threshold}`)
            sendText(`Init Prices:\n`
                +`Outgoing fare ${originAirport} -> ${destinationAirport}: $${lowestOutgoingFare}\n`
                +`Return fare ${destinationAirport} -> ${originAirport}: $${lowestReturnFare}`)
        }
        else if(newLowestOutgoingFare < threshold || newLowestRetunFare < threshold){
            //Sends a text if both fares are down
            if(newLowestOutgoingFare < lowestOutgoingFare && newLowestRetunFare < lowestReturnFare){
                lowestOutgoingFare = newLowestOutgoingFare;
                lowestReturnFare = newLowestRetunFare;
                lastUpdated = Date.now();
                sendText(`BOTH OUTGOING AND RETURN FARES FOR ${originAirport} -> ${destinationAirport} FELL!!!\n`
                +`New Outgoing Fare: $${lowestOutgoingFare}\n`
                +`New Return Fare: $${lowestReturnFare}`)
            }
            //Sends a text if the outgoing fare is down
            else if(newLowestOutgoingFare < lowestOutgoingFare){
                lowestOutgoingFare = newLowestOutgoingFare;
                lastUpdated = Date.now();
                sendText(`OUTGOING FARE ${originAirport} -> ${destinationAirport} FELL!!!\n`
                +`New Outgoing Fare: $${lowestOutgoingFare}\n`
                +`Return fare ${destinationAirport} -> ${originAirport}: $${lowestReturnFare}`)
            } 
            //Sends a text if the return fare is down               
            else if(newLowestRetunFare < lowestReturnFare){
                lowestReturnFare = newLowestRetunFare;
                lastUpdated = Date.now();
                sendText(`RETURN FARE ${destinationAirport} -> ${originAirport} FELL!!!\n`
                +`Outgoing fare ${originAirport} -> ${destinationAirport}: ${lowestOutgoingFare}\n`
                +`New Return Fare: ${lowestReturnFare}`)
            }
            else{
                //No change
                console.log("No change in ticket prices");
                console.log(`Outgoing Fare: ${lowestOutgoingFare}\n`
                +`Return Fare: $${lowestReturnFare}`);
                lastUpdated = Date.now();
            } 
        }
        else{
            //No change
            console.log("Ticket prices still above threshold");
            console.log(`Outgoing Fare: $${lowestOutgoingFare}\n`
            +`Return Fare: $${lowestReturnFare}`);
            lastUpdated = Date.now();
        }
        console.log(`\n*******************************************\n`);
    })
}

getTicketPrices();
setInterval(function(){getTicketPrices()},interval*60*1000);

const sendText = (message) => {
    console.log(message);    
    if(isTwilioConfigured){
        client.messages
            .create({
                to: process.env.toPhoneNumber || devConfig.toPhoneNumber,
                from: process.env.fromPhoneNumber || devConfig.fromPhoneNumber,
                body: message,
            })
            .then((message) => {
                console.log(`Sent the message. Message ID:${message.sid}`);
                console.log(`\n*******************************************\n`);
            });
    }
}

app.get("/", (req, res) => {
    res.send(`<div style="font-size:x-large">Showing current lowest prices</div>
        <div>Outgoing fare ${originAirport} -> ${destinationAirport}: $${lowestOutgoingFare}</div>
        <div>Return fare ${destinationAirport} -> ${originAirport}: $${lowestReturnFare}</div>
        <div>Last Updated (epoch time): ${lastUpdated}</div>`)
});

httpServer.listen(process.env.VCAP_APP_PORT || 5000, function () {
	console.log ('Server started on port: ' + httpServer.address().port);
});

module.exports = app;