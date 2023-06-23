// You MUST have a file called "token.secret" in the same directory as this file!
// This should be the secret token found in https://dashboard.ngrok.com/
// Make sure it is on a single line with no spaces!
// It will NOT be committed.

// TO START
//   1. Open a terminal and run 'npm start'
//   2. Open another terminal and run 'npm run tunnel'
//   3. Copy/paste the ngrok HTTPS url into the DialogFlow fulfillment.
//
// Your changes to this file will be hot-reloaded!

import fetch from 'node-fetch';
import fs from 'fs';
import ngrok from 'ngrok';
import morgan from 'morgan';
import express from 'express';

// Read and register with secret ngrok token.
ngrok.authtoken(fs.readFileSync("token.secret").toString().trim());

// Start express on port 53705
const app = express();
const port = 53705;

// Accept JSON bodies and begin logging.
app.use(express.json());
app.use(morgan(':date ":method :url" :status - :response-time ms'));

// "Hello World" endpoint.
// You should be able to visit this in your browser
// at localhost:53705 or via the ngrok URL.
app.get('/', (req, res) => {
  res.status(200).send(JSON.stringify({
    msg: 'Express Server Works!'
  }))
})

// Dialogflow will POST a JSON body to /.
// We use an intent map to map the incoming intent to
// its appropriate async functions below.
// You can examine the request body via `req.body`
// See https://cloud.google.com/dialogflow/es/docs/fulfillment-webhook#webhook_request
app.post('/', (req, res) => {
  const intent = req.body.queryResult.intent.displayName;

  // A map of intent names to callback functions.
  // The "HelloWorld" is an example only -- you may delete it.
  const intentMap = {
    "GetNumUsers": doNumberOfUsers,
    "GetNumMessages": doNumberofPosts,
    "GetChatroomMessages": doNumberOfMessages,
  }

  if (intent in intentMap) {
    // Call the appropriate callback function
    intentMap[intent](req, res);
  } else {
    // Uh oh! We don't know what to do with this intent.
    // There is likely something wrong with your code.
    // Double-check your names.
    console.error(`Could not find ${intent} in intent map!`)
    res.status(404).send(JSON.stringify({ msg: "Not found!" }));
  }
})

// Open for business!
app.listen(port, () => {
  console.log(`DialogFlow Handler listening on port ${port}. Use 'npm run tunnel' to expose this.`)
})

// Your turn!
// See https://cloud.google.com/dialogflow/es/docs/fulfillment-webhook#webhook_response
// Use `res` to send your response; don't return!

async function doNumberOfUsers(req, res) {
  const resp = await fetch("https://cs571.org/s23/hw12/api/numUsers", {
    headers: {
      "X-CS571-ID": "bid_1c5bcd34828a97342b93"
    }
  });
  const json = await resp.json();
  // console.log(json);

  res.status(200).send({
    fulfillmentMessages: [
      {
        text: {
          text: [
            "There are " + json.users + " users registered for BadgerChat!"
          ]
        }
      }
    ]
  })
}

async function doNumberofPosts(req, res) {
  //console.log(JSON.stringify(req.body, null, 2));
  //console.log(req.body.queryResult.parameters.chatroomName)
  //console.log(req.body.queryResult.parameters.chatroomName === "")
  //let room_name = req.body.queryResult.parameters.chatroomName;

  if (req.body.queryResult.parameters.chatroomName === "") {
    const resp = await fetch("https://cs571.org/s23/hw12/api/numMessages", {
      headers: {
        "X-CS571-ID": "bid_1c5bcd34828a97342b93"
      }
    });
    const json = await resp.json();
    //console.log(json);

    res.status(200).send({
      fulfillmentMessages: [
        {
          text: {
            text: [
              "There are " + json.messages + " messages on BadgerChat!"
            ]
          }
        }
      ]
    })

  } else {
    let name = req.body.queryResult.parameters.chatroomName.toLowerCase();
    name = name[0].toUpperCase() + name.slice(1);
    // have to do this because what if the user puts in lowercase letters? Turns out the API
    // requires case sensitive names. We must capitalize the first letter of the chatroom.

    const resp = await fetch(`https://cs571.org/s23/hw12/api/chatroom/${name}/numMessages`, {
      headers: {
        "X-CS571-ID": "bid_1c5bcd34828a97342b93"
      }
    });
    const json = await resp.json();
    //console.log(json);

    res.status(200).send({
      fulfillmentMessages: [
        {
          text: {
            text: [
              "There are " + json.messages + " messages in the " + name + " chatroom!"
            ]
          }
        }
      ]
    })
  }
}

async function doNumberOfMessages(req, res) {
  //console.log(req.body.queryResult.parameters);
  let num_posts_wanted = parseInt(req.body.queryResult.parameters.numberOfPosts);
  if (num_posts_wanted > 5) { num_posts_wanted = 5; }
  //console.log(num_posts_wanted);

  let chatroom_name = req.body.queryResult.parameters.chatRoomName.toLowerCase();
  chatroom_name = chatroom_name[0].toUpperCase() + chatroom_name.slice(1);
  // have to do this because what if the user puts in lowercase letters? Turns out the API
  // requires case sensitive names. We must capitalize the first letter of the chatroom.

  const resp = await fetch(`https://cs571.org/s23/hw12/api/chatroom/${chatroom_name}/messages`, {
    headers: {
      "X-CS571-ID": "bid_1c5bcd34828a97342b93"
    }
  });
  const json = await resp.json();

  let most_recent_messages = [];
  for (let i = 0; i < num_posts_wanted; i++) {
    most_recent_messages[i] = json.messages[i];
  }

  //console.log(most_recent_messages);
  let stuffToDisplay = [];

  /*
    citation for help on for await function
    https://stackoverflow.com/questions/37576685/using-async-await-with-a-foreach-loop
  */
  for await (const message of most_recent_messages) {
    //console.log(message);
    stuffToDisplay.push({
      card: {
        title: message.title,
        subtitle: message.poster,
        buttons: [
          {
            text: "READ MORE",
            postback: `https://cs571.org/s23/badgerchat/chatrooms/${chatroom_name}/messages/${message.id}`
          }
        ]
      }
    });
  }

  stuffToDisplay.unshift({
    text: {
      text: [
        num_posts_wanted === 1 ? "Here is the most recent post from " + chatroom_name + "!" : "Here are the " + num_posts_wanted + " most recent posts from " + chatroom_name + "!"
      ]
    }
  });
  //console.log(stuffToDisplay);

  res.status(200).send({
    fulfillmentMessages: stuffToDisplay
  });
}
