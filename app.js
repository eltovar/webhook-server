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

app.get('/', function (req, res){
    res.sendFile(path.join(__dirname + '/index.html'));
});


app.post('/webhook', express.json(), function (req, res){  //ruta del webhook Inicio

  // Log para ver la petición completa de Dialogflow (útil para depurar en Railway Logs)
  const agent = new WebhookClient({ request: req, response: res });
  console.log("Peticion del Webhook en DialogFlow", JSON.stringify(req.headers));
  console.log("Peticion del Webhook en DialogFlow", JSON.stringify(req.body));


    function welcome(agent) {
      console.log("Intent Default Welcome Intent activado.");
      agent.add('¡Hola! Es un placer saludarte desde el webhook.');
    }
  
    // --- Función para manejar el "Default fallback Intent" ---
    function fallback(agent) {
      console.log("Intent Default fallback Intent activado.");
      agent.add('Hola!!, soy un bot de prueba pero no tengo nada que decirte.');
    }

    function WebhookPrueba(agent) {
      console.log("Intent webhookPrueba Intent activado.");
      agent.add('Hola!!, estoy en el webhook de prueba');
    }

    // --- Función para manejar el Intent "decirHola" PRUEBA---

    function decirHola(agent) {
    console.log("agent.parameters recibido:", agent.parameters); // AÑADE ESTO
    const personObject = agent.parameters.person;

    let personName = null;

    if (personObject && typeof personObject === 'object' && personObject.name) {
        personName = personObject.name;
    } else if (typeof personObject === 'string' && personObject !== '') { // Add this check if it sometimes comes as a simple string
        personName = personObject;
    } else {
        console.warn("El parámetro 'person' no es un objeto con 'name' ni una cadena simple con valor:", personObject); // AÑADE ESTO
    }

    if (personName) {
        agent.add(`¡Hola, ${personName}! Es un placer saludarte desde el webhook.`);
    } else {
        agent.add('¡Hola! Es un placer saludarte desde el webhook.');
    }
}



  //FUNION DECIR HOLA anterior
    
      /*function decirHola(agent) {
      const person = String(agent.parameters.person); // Convierte a cadena explícitamente
        if (person && person !== 'undefined' && person !== 'null' && person !== '[object Object]') { // Filtra valores no deseados
         agent.add(`¡Hola, ${person}! Es un placer saludarte desde el webhook.`);
        } else {
          agent.add('¡Hola! E s un placer saludarte desde el webhook.');
        }
      }*/ 
    


    // --- Mapeo de Intents a funciones manejadoras ---
    let intentMap = new Map();
    intentMap.set('Default Welcome Intent', welcome);// Mapea el Intent de Dialogflow a tu función 'welcome'
    intentMap.set('Default Fallback Intent', fallback); // Mapea el Intent de Dialogflow a tu función 'fallback'
    intentMap.set('WebhookPrueba', WebhookPrueba); // Mapea el Intent de Dialogflow a tu función 'webhookPrueba'
    intentMap.set('decirHola', decirHola); // Mapea el Intent de Dialogflow a tu función 'decirHola'
    
    
    
    agent.handleRequest(intentMap);
  
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