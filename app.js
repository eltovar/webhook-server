const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { WebhookClient } = require('dialogflow-fulfillment');
const axios = require('axios');
require('dotenv').config(); // Cargar variables de entorno desde el archivo .env

const app = express();
const port = process.env.PORT || 8080;

// 5. Obtener la URL de la API de FastAPI desde las variables de entorno
const FASTAPI_API_URL = process.env.FASTAPI_LANGCHAIN_API_URL;
console.log(`Webhook configurado para llamar a la API de FastAPI en: ${FASTAPI_API_URL}`);


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

  // --- Nueva Función para Llamar a la API de FastAPI (LangChain/RAG/Agente) ---
  
   async function langchainAgent(agent) {
    const userQuery = agent.query; // La pregunta del usuario desde Dialogflow
    const dialogflowParameters = agent.parameters; // <-- ¡Aquí obtenemos los parámetros!

    console.log(`Intent para Agente LangChain activado. Pregunta del usuario: "${userQuery}"`);
    console.log("Parámetros de Dialogflow:", JSON.stringify(dialogflowParameters, null, 2)); // Para ver los parámetros en los logs

    if (!FASTAPI_API_URL) {
        console.error("ERROR: FASTAPI_LANGCHAIN_API_URL no está configurada en .env");
        agent.add("Lo siento, aun no tenemos información disponible.");
        return;
    }

    try {
        // Hacer la petición POST a la API de FastAPI
        const response = await axios.post(FASTAPI_API_URL, {
            query: userQuery,             // La pregunta original del usuario
            parameters: dialogflowParameters // <-- ¡Aquí enviamos todos los parámetros!
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const apiResponse = response.data; // La respuesta de la API de FastAPI

        // Suponemos que la API de FastAPI devuelve un JSON con una clave 'answer'
        if (apiResponse && apiResponse.answer) {
            agent.add(apiResponse.answer); // Envía la respuesta de la API de FastAPI a Dialogflow
            console.log("Respuesta de la API de FastAPI enviada a Dialogflow:", apiResponse.answer);
        } else {
            agent.add("No pude obtener una respuesta clara del sistema de información. ¿Podrías intentar de otra forma?");
            console.warn("La API de FastAPI no devolvió la clave 'answer' esperada:", apiResponse);
        }

    } catch (error) {
        console.error("Error al llamar a la API de FastAPI:", error.message);
        if (error.response) {
            console.error("Respuesta de error de FastAPI:", error.response.data);
            if (error.response.status === 404) {
                agent.add("Lo siento, no pude conectar con el servicio de información (error 404). Asegúrate de que la URL sea correcta y el servicio esté en línea.");
            } else if (error.response.status === 500) {
                agent.add("Hubo un error interno en el servicio de información. Por favor, intenta de nuevo o contacta al soporte.");
            } else {
                agent.add(`Hubo un problema (${error.response.status}) al procesar tu solicitud con el sistema de información. Intenta de nuevo.`);
            }
        } else {
            agent.add("Lo siento, no pude contactar el sistema de información. Verifica tu conexión o intenta más tarde.");
        }
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
    intentMap.set('langchainAgent', langchainAgent); // Mapea el Intent de Dialogflow a tu función 'handleLangchainAgent'

    
    
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