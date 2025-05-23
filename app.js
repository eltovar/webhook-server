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


app.post('/webhook', (req, res) => { //ruta del webhook Inicio


  const agent = new WebhookClient({ request: req, response: res });

    function welcome(agent) {
        agent.add('Welcome to my agent!');
    }
  
    // --- Función para manejar el "Default Welcome Intent" ---
    function fallback(agent) {
      console.log("Intent Default Welcome Intent activado.");
      agent.add('Hola!!, soy un bot de prueba');
    }

    // --- Mapeo de Intents a funciones manejadoras ---
    let intentMap = new Map();
    intentMap.set('Default Welcome Intent', welcome);// Mapea el Intent de Dialogflow a tu función 'welcome'
    intentMap.set('Default Fallback Intent', fallback); // Mapea el Intent de Dialogflow a tu función 'fallback'
    
    
    agent.handleRequest(intentMap);

  console.log("Peticion del Webhook en DialogFlow", req.body);
  
  /*var speech =
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
*/

  });//fin del webhook

app.listen(port, () => {
    // Imprime un mensaje en la consola indicando que el servidor está corriendo y la dirección en la que se puede acceder.
    console.log(`Servidor corriendo en http://localhost:${port}`);
});//puerto de escucha