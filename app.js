const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { WebhookClient } = require('dialogflow-fulfillment');

const app = express();
const port = process.env.PORT || 8080;

app.use(bodyParser.json());

app.use(
    bodyParser.urlencoded({
        extended: true
    })
);

app.use(bodyParser.json());


app.get('/', function (req, res){
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.post('/webhook', (req, res) => {


  const agent = new WebhookClient({ request: req, response: res });

    function welcome(agent) {
        agent.add('Welcome to my agent!');
    }

    function fallback(agent) {
        agent.add('I did not understand');
        agent.add('I am sorry, can you try again?');
    }

    let intentMap = new Map();

    intentMap.set('Default Welcome Intent', welcome);
    intentMap.set('Default Fallback Intent', fallback);
    
    agent.handleRequest(intentMap);

  console.log("Peticion del Webhook en DialogFlow", req.body);
  var speech =
  req.body.queryResult &&
  req.body.queryResult.parameters &&
  req.body.queryResult.parameters.echoText
    ? req.body.queryResult.parameters.echoText
    : "Seems like some problem. Speak again.Body: ${json.stringify(req.body)}";
  return res.json({

  "fulfillmentText": speech,
  "fulfillmentMessages": [
    {
      "text": {
        "text": [speech]
      }
    }
  ],
  "source": "<webhookpn1>"


  });

    //Logica para procesar el webhook de DialogFlow

  });


app.listen(port, () => {
    // Imprime un mensaje en la consola indicando que el servidor está corriendo y la dirección en la que se puede acceder.
    console.log(`Servidor corriendo en http://localhost:${port}`);
});//puerto de escucha