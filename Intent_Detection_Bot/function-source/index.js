// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';

const yelp = require('yelp-fusion');
const functions = require('firebase-functions');
const {WebhookClient, Image} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
// const {
//   dialogflow,
//   Image,
//   Suggestions
// } = require('actions-on-google');
 
process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
let db = admin.firestore();
const settings = {timestampsInSnapshots: true};
db.settings(settings);
 
const Datastore = require('@google-cloud/datastore');
const datastore = new Datastore({
  projectId: 'test-agent-ivqrnw'
});

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  const sessionId = request.body.session.split("/").reverse()[0];

  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
 
  function welcome(agent) {
    agent.add(`Welcome to my agent!`);
  }
 
  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }
  
  function book_table(agent) {
    var table_guests = agent.parameters.guests;
    var table_date = new Date(agent.parameters.date);
    var table_time = new Date(agent.parameters.time);
    
    const taskKey = datastore.key('table_item');

    let bookingDate  = new Date(table_date);
    bookingDate.setHours(table_time.getHours());
    bookingDate.setMinutes(table_time.getMinutes());

    let now = new Date();

    if (table_guests < 1){
      agent.add('The reservation needs to be made for at least 1 person. Please try again!');
    } else if (bookingDate < now){
      agent.add(`You can't make a reservation in the past. Please try again !`); 
    } else {
      let timezone = parseInt(agent.parameters.time.toString().slice(19,22));
      bookingDate.setHours(bookingDate.getHours() + timezone);
      // agent.add(`You have successfully booked a table for ${table_guests} guests on ${bookingDate.toString().slice(0,21)}`);
      // agent.add('See you at the restaurant! Have a wonderful day!');
      const entity = {
      key: taskKey,
      data: {
      item_name:'table',
      guests: table_guests,
      date: table_date,
      time: table_time}
      };
      return datastore.save(entity).then(() => {
        console.log('Saved ${entity.key.name}: ${entity.data.item_name}'); 
        agent.add(`You have successfully booked a table for ${table_guests} guests on ${bookingDate.toString().slice(0,21)}`);
        agent.add('See you at the restaurant! Have a wonderful day!');                  
                  });   
    }                       
  }
  // YELP 
  var yelp_apiKey = 'ibNaNslAtMIT8-MoDoyEMyny3aVuylvRkK40LXypzY9Nfip5G525uVkuDHDT5MMH2ZbSOq6RS1xQztovj6o1aFkya_YRxmKB7ovfs5KbQXH5t5hsyt4GT1UKZ_T4XnYx';
  const client = yelp.client(yelp_apiKey);
  
  // Business Search
  function business_search(params){
    return client.search(params)
  };

  // Reviews search
  function reviews(params){
    return client.reviews(params)
  };

  // Business Details
  function business_details(params){
    return client.business(params)
  };

  //Events 
function event_search(params){
  return client.eventSearch(params)
};

async function do_event_search(agent){
  // agent parameters
  // var business_location = "washington DC";
  var business_location = JSON.stringify(agent.parameters.mylocation);
  console.log(business_location)

  var start_date = parseInt((new Date().getTime() / 1000).toFixed(0)) //API requires unix time
  var tomorrow = new Date();
  var end_date = tomorrow.setDate(tomorrow.getDate() + 1);
  var end_date_unix = parseInt((end_date / 1000).toFixed(0))
  
  var radius = 40000
  // var sort_on = "time_start"
  var sort_on = "time_start"
  var categories = 'food-and-drink'

  try {
    const event_search_result = await event_search({
      location:business_location,
      start_date: start_date,
      radius: radius,
      end_date: end_date_unix,
      categories: categories
    });

    const firstEvent = event_search_result.jsonBody.events[0];
    const event_name = firstEvent.name;
    const event_description = firstEvent.description;
    const event_address = firstEvent.location.address1;

    // agent.add("Doing Event Search" + business_location)
    agent.add(`Check out this event near you on ${event_address}, ${event_name}, ${event_description} `); 

  } catch(err){ 
    console.log(err) 
    agent.add("I couldn't find any events for today near you"); 
    };
};

  async function search_business(agent){

    // agent parameters
    console.log(agent.parameters.user_location);
    console.log(typeof agent.parameters.user_location);
    console.log(agent.parameters.business_name);
    console.log(typeof agent.parameters.business_name);

    var business_name = JSON.stringify(agent.parameters.business_name);
    // var business_location = '4455 connecticut ave nw washington DC' 
    var business_location = agent.parameters.user_location;

    console.log(typeof business_name);
    console.log(typeof business_location);

    if (business_location == null || business_location == "") {
      console.log("went in the loop")
      business_location = '4455 connecticut ave nw washington DC' 
    };
  
    console.log("didn't go in the loop" + business_location );

    // Get Business info from Business Endpoint
    try {
    const bus_resp = await business_search({term: business_name , location:business_location});
    console.log("Got the business info")
 
    // Get the First Business from the response
    const firstResult = bus_resp.jsonBody.businesses[0];
    const id = firstResult.id;
    const resolved_name = firstResult.name;


    // Get the Review for the first Business
    const reviews_body = await reviews(id);
    const reviews_list = reviews_body.jsonBody.reviews;

    // Process the review List
    const text_0 = reviews_list[0].text;
    const rating_0 = reviews_list[0].rating;
    const time_created_0 = reviews_list[0].time_created;
    
    const text_1 = reviews_list[1].text;
    const rating_1 = reviews_list[1].rating;
    const time_created_1 = reviews_list[1].time_created;
    
    const text_2 = reviews_list[2].text;
    const rating_2 = reviews_list[2].rating;
    const time_created_2 = reviews_list[2].time_created;


    //  Extract desired params
    const rating = firstResult.rating;
    const address = firstResult.location.display_address.toString();
    const review_count = firstResult.review_count;
    const phone = firstResult.display_phone;
    const image_url = firstResult.image_url;
    const yelp_url = firstResult.url;
    const price = firstResult.price;


    // Logging
    console.log(firstResult)
    console.log(rating)
    console.log(address)
    console.log(reviews_body)
    console.log(rating_0, text_0)

    agent.add(`${resolved_name} is located at ${address}. It's been reviewed ${review_count} times and has an average rating of ${rating} stars.`);
    agent.add(new Card({
          title: resolved_name,
          imageUrl: image_url,
          text: `Phone: ${phone} \n Price: ${price}`,
          buttonText: 'View Yelp page',
          buttonUrl: yelp_url
        })
      );
    
     agent.add(`💁 Here are some Reviews  \n ${time_created_0} : ${text_0} ⭐ ${rating_0} \n\n ${time_created_1} : ${text_1} ⭐ ${rating_1} \n\n ${time_created_2} : ${text_2} ⭐ ${rating_2}`)

    } catch(err){
      console.log(err)
      agent.add("Oops ! Something went wrong. Please try again.")
    };
  };

    
   async function search_business_details(agent){

    // agent parameters
    var business_name = JSON.stringify(agent.parameters.business_ent);
    var business_location = agent.parameters.search_location;
    var d = new Date();

    if (d == null || d == "") {
      // console.log("got here")
      d = new Date();
    };
  
    // Get Business info from Business Endpoint
    try {
      const bus_resp = await business_search({term: business_name , location:business_location});

      // Get the First Business from the response
      const firstResult = bus_resp.jsonBody.businesses[0];
      const id = firstResult.id
      // const resolved_name = firstResult.name

      // Get the Review for the first Business
      const details_body = await business_details(id);
      const details_list = details_body.jsonBody;
      
      
      // logging
      console.log(details_list)
      console.log(details_list.hours[0].open)
      console.log(d)
      console.log(d.getDay())
      var start_time;
      var end_time;
      
      var dayofweek = d.getDay();
      var hours_list = details_list.hours[0].open;
      if (dayofweek == 0) {
          start_time = hours_list[6].start;
          end_time = hours_list[6].end;
      } else if (dayofweek == 1){
          start_time = hours_list[0].start;
          end_time = hours_list[0].end;
      } else if (dayofweek == 2){
          start_time = hours_list[1].start;
          end_time = hours_list[1].end;    
      } else if (dayofweek == 3){
          start_time = hours_list[2].start;
          end_time = hours_list[2].end;    
      } else if (dayofweek == 4){
          start_time = hours_list[3].start;
          end_time = hours_list[3].end;    
      } else if (dayofweek == 5){
          start_time = hours_list[4].start;
          end_time = hours_list[4].end;    
      } else if (dayofweek == 6){
          start_time = hours_list[5].start;
          end_time = hours_list[5].end; 
      }
      // start_time = details_list.hours[0].open[d.getDay()].start;
      // end_time = details_list.hours[0].open[d.getDay()].end;

      console.log(hours_list)
      console.log(`The Operating hours are ${start_time} to ${end_time}`)
      agent.add(`The Operating hours are ${start_time} to ${end_time}`)

      console.log(`They are open for ${details_list.transactions.toString()}`)
      agent.add(`They are open for ${details_list.transactions.toString()}`)

    } catch(err){
      console.log(err)
      agent.add("Oops ! Something went wrong. Please try again.")
    };
  };
  // search_business.catch(alert)

  // function search_business(agent) {
  //   var id; 
  //   var business_name = agent.parameters.business_name;
  //   var apiKey = 'ibNaNslAtMIT8-MoDoyEMyny3aVuylvRkK40LXypzY9Nfip5G525uVkuDHDT5MMH2ZbSOq6RS1xQztovj6o1aFkya_YRxmKB7ovfs5KbQXH5t5hsyt4GT1UKZ_T4XnYx';

  //   const searchRequest = {
  //     term: business_name,
  //     location: 'washington, dc'
  //   };

  //   const client = yelp.client(apiKey);
  //   return client.search(searchRequest).then(response => {
  //     const firstResult = response.jsonBody.businesses[0];
  //     const prettyJson = JSON.stringify(firstResult, null, 4);
  //     console.log(prettyJson);

  //     var rating = firstResult.rating;
  //     var address = JSON.stringify(firstResult.location.display_address[0] + ', ' + firstResult.location.display_address[1]);
  //     id = firstResult.id;

  //     // agent.add(`Searching for business ${searchRequest.term}` );
  //     agent.add(`Address is ${address}, Rating for business ${rating}` );
  //     console.log(rating);
  //   }).catch(e => {
  //     console.log(e);
  //   })

  //   // agent.add('The rating for this place is' + rating)
  //   // agent.add(`Searching for business ${searchRequest.term}`);
  //   // agent.add(`Rating for business ${rating}`);
  // }


  function getMeters(i) {
     return i*1609.344;
	};
 
  function get_restaurant(agent) {
    //agent.requestSource = agent.ACTIONS_ON_GOOGLE;
    //let conv = agent.conv(); // Get Actions on Google library conv instance
    var res_location = agent.parameters.location;
    var res_proximity = agent.parameters.proximity;
    var res_cuisine = agent.parameters.cuisine;

    const axios = require('axios');
    var api_key = "AIzaSyBt6Ow2p6NJQY2XA65lw35ADis2TnQ3qPI";
    var user_location = JSON.stringify(res_location["street-address"]);

    var user_proximity;
    if (res_proximity.unit == "mi") {
      user_proximity = JSON.stringify(getMeters(res_proximity.amount));
    } else {
      user_proximity = JSON.stringify(res_proximity.amount * 1000);
    }
    var geo_code = "https://maps.googleapis.com/maps/api/geocode/json?address=" + encodeURIComponent(user_location) + "&region=us&key=" + api_key;
    
    return axios.get(geo_code)
      .then(response => {
        var places_information = response.data.results[0].geometry.location;
        var place_latitude = JSON.stringify(places_information.lat);
        var place_longitude = JSON.stringify(places_information.lng);
        var coordinates = [place_latitude, place_longitude];
        return coordinates;
    }).then(coordinates => {
      var lat = coordinates[0];
      var long = coordinates[1];
      var place_search = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=" + encodeURIComponent(res_cuisine) +"&inputtype=textquery&fields=photos,formatted_address,name,opening_hours,rating&locationbias=circle:" + user_proximity + "@" + lat + "," + long + "&key=" + api_key;
      return axios.get(place_search)
      .then(response => {
          var photo_reference = response.data.candidates[0].photos[0].photo_reference;
          var address = JSON.stringify(response.data.candidates[0].formatted_address);
          var name = JSON.stringify(response.data.candidates[0].name);
          var photo_request = 'https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=' + photo_reference + '&key=' + api_key;
          agent.add(`Okay, the restaurant name is ` + name + ` and the address is ` + address + `. The following photo uploaded from a Google Places user might whet your appetite!`);
          agent.add(new Image(photo_request));
      })
  })
  }

  function showBasket(agent) {
    const basket = agent.context.get('basket');
    
    if (basket && basket.parameters.items && Object.keys(basket.parameters.items).length) {
      const basketItems = basket.parameters.items,
            itemKeys = Object.keys(basketItems);

      var basketOutput = `You've got: `;
      for (let i = 0; i < itemKeys.length; i++) {
        let item = basketItems[itemKeys[i]];
        if ((i > 0) && (i === itemKeys.length - 1)) {
          basketOutput += ` and `;
        }
        else if (i > 0) {
          basketOutput += `, `;
        }
        basketOutput += `${item.amount} ${item.type} in ${item.size}`;
      }
      agent.add(basketOutput);
    }
    else {
      agent.add(`There's nothing in your basket yet`);
    }
  };
  
  function confirmItem(agent) {
    const item = agent.context.get('item'),
          amount = item.parameters.amount,
          size = item.parameters.size,
          type = item.parameters.type,
          id = item.parameters.id || request.body.responseId;

    let basketContext = {'name': 'basket', 'lifespan': 50, 'parameters': {}},
        itemContext = {'name': 'item', 'lifespan': 2, 'parameters': {}},
        items = {};

    // if there already is an object of items, grab it
    if (agent.context.get('basket')) {
      items = agent.context.get('basket').parameters.items;  
    }
    // in any case, push the new item
    items[id] = {
      "type": type,
      "size": size,
      "amount": amount
    };
    
    // persist the new basket state
    console.log(JSON.stringify(items));
    basketContext.parameters.items = items;
    agent.context.set(basketContext);
    
    // add the ID to the item context, so that we can modify the item later
    itemContext.parameters.amount = amount;
    itemContext.parameters.size = size;
    itemContext.parameters.type = type;
    itemContext.parameters.id = id;
    agent.context.set(itemContext);
    
    agent.add(`Confirming ${amount} ${type} in ${size}. Anything else?`);
  };
  
  // delete the item id so that we don't overwrite the previous item
  function resetItemID(agent) {
    const item = agent.context.get('item'),
          amount = item.parameters.amount,
          size = item.parameters.size,
          type = item.parameters.type;
    
    let itemContext = {'name': 'item', 'lifespan': 2, 'parameters': {}};
    itemContext.parameters.amount = amount;
    itemContext.parameters.size = size;
    itemContext.parameters.type = type;
    itemContext.parameters.id = '';
    agent.context.set(itemContext);
    
    agent.add(`Fantastic! so that's ${amount} ${type} in ${size}. Can you confirm?`);
  };
  
  function removeItem(agent) {
    const type = agent.parameters.type;

    let basketContext = {'name': 'basket', 'lifespan': 50, 'parameters': {}},
        basketItems = {};
    
    if (agent.context.get('basket')) {
      basketItems = agent.context.get('basket').parameters.items;
    }
    let itemKeys = Object.keys(basketItems);
    for (let i = 0; i < itemKeys.length; i++) {
      let item = basketItems[itemKeys[i]];
      if (item.type === type) {
        delete basketItems[itemKeys[i]];
      }
    }
	
    basketContext.parameters.items = basketItems;
    agent.context.set(basketContext);
    agent.add(`No issues, I have removed the pizza ${type} from your basket`);
  };
  
  function emptyBasket() {
  	let basketContext = {'name': 'basket', 'lifespan': 0},
        itemContext = {'name': 'item', 'lifespan': 0};
    agent.context.set(basketContext);
    agent.context.set(itemContext);
    agent.add(`Cool, let's start over. What kind of pizza would you like?`);
  };
  
  function finishOrder(agent) {
    if (agent.context.get('basket')) {
      agent.add(`Hurray! you have completed your order!`);
    
      const items = agent.context.get('basket').parameters.items,
            docRef = db.collection('orders').doc(sessionId);

      return docRef.set(items, { merge: true })
        .then(() => {
      	  let basketContext = {'name': 'basket', 'lifespan': 0},
          itemContext = {'name': 'item', 'lifespan': 0};
    
          // reset contexts
          agent.context.set(basketContext);
          agent.context.set(itemContext);
        })
        .catch(err => {
        console.log(`Error writing to Firestore: ${err}`);
      });
    }
    else {
      agent.add(`There's nothing in your basket yet`);
    }
  };


  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('book_table', book_table);
  // intentMap.set('get_restaurant', get_restaurant);
  intentMap.set('search_business', search_business);
  intentMap.set('search_business.details',search_business_details);

  intentMap.set('order.showbasket', showBasket);
  intentMap.set('item.confirm.yes.moreno.finishorderno', showBasket);
  intentMap.set('item.confirm.yes', confirmItem);
  intentMap.set('item.start.generic', resetItemID);
  intentMap.set('item.type.start.positive.yes', resetItemID);
  intentMap.set('item.confirm.yes.moreno.finishorderyes', finishOrder);
  intentMap.set('item.remove', removeItem);
  intentMap.set('order.cancel', emptyBasket);
  intentMap.set('order.finish', finishOrder);
  intentMap.set('do_event_search', do_event_search);


  // intentMap.set('your intent name here', yourFunctionHandler);
  // intentMap.set('your intent name here', googleAssistantHandler);
  agent.handleRequest(intentMap);
});
