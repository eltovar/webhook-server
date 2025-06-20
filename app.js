const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { WebhookClient } = require('dialogflow-fulfillment');
const axios = require('axios');

//const { OpenAI } = require('openai'); Importar la clase OpenAI de la librería openai
require('dotenv').config(); // Cargar variables de entorno desde el archivo .env

const app = express();
const port = process.env.PORT || 8080;

// 5. Obtener la URL de la API de FastAPI desde las variables de entorno
const FASTAPI_API_URL = process.env.FASTAPI_LANGCHAIN_API_URL;
console.log(`Webhook configurado para llamar a la API de FastAPI en: ${FASTAPI_API_URL}`);

//const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/*const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});*/

app.use(bodyParser.json());

app.use(
    bodyParser.urlencoded({
        extended: true
    })
);

app.get('/', function (req, res){
    res.sendFile(path.join(__dirname + '/index.html'));
});


// --- Definición de la Ruta Principal del Webhook ---
// Esta es la ruta a la que Dialogflow enviará las peticiones HTTP POST.
// `express.json()` se usa como middleware específico para esta ruta también.
app.post('/webhook', express.json(), function (req, res){
    // `WebhookClient` es una clase de la librería `dialogflow-fulfillment`
    // que simplifica la interacción con las peticiones y respuestas de Dialogflow.
    // `req` es el objeto de la petición HTTP entrante de Express.
    // `res` es el objeto de la respuesta HTTP saliente de Express.
    const agent = new WebhookClient({ request: req, response: res }); 

    // --- Logs para Depuración ---
    // Imprime los encabezados de la petición de Dialogflow en la consola/logs del servidor.
    // Útil para verificar metadatos de la petición.
    console.log("Peticion del Webhook en DialogFlow (headers):", JSON.stringify(req.headers));
    // Imprime el cuerpo completo de la petición de Dialogflow en la consola/logs.
    // Aquí puedes ver los Intents, parámetros, contexto, etc., que Dialogflow envía.
    console.log("Peticion del Webhook en DialogFlow (body):", JSON.stringify(req.body));

    // --- Funciones de Manejo de Intents ---
    // Cada una de estas funciones maneja un Intent específico de Dialogflow.
    // El nombre de la función debe coincidir con el nombre del Intent en Dialogflow
    // que se mapeará en `intentMap`.

    // Función para el Intent "Default Welcome Intent"
    function welcome(agent) {
        console.log("Intent Default Welcome Intent activado.");
        // `agent.add()` se usa para añadir una respuesta que Dialogflow enviará al usuario.
        agent.add('¡Hola! Es un placer saludarte desde el webhook.');
    }

    // Función para el "Default fallback Intent" (cuando Dialogflow no reconoce un Intent)
    function fallback(agent) {
        console.log("Intent Default fallback Intent activado.");
        agent.add('Hola!!, soy un bot de prueba pero no tengo nada que decirte.');
    }

    // Función para el Intent "WebhookPrueba" (un Intent de prueba personalizado)
    function WebhookPrueba(agent) {
        console.log("Intent webhookPrueba Intent activado.");
        agent.add('Hola!!, estoy en el webhook de prueba');
    }

    // --- Función para manejar el Intent "decirHola" (con extracción de parámetro "person") ---
    function decirHola(agent) {
        // `agent.parameters` contiene los parámetros extraídos por Dialogflow para este Intent.
        console.log("agent.parameters recibido:", agent.parameters); 
        const personObject = agent.parameters.person; // Intenta obtener el parámetro 'person'

        let personName = null; // Variable para almacenar el nombre de la persona

        // Lógica para manejar diferentes formatos en que Dialogflow puede enviar el parámetro 'person':
        // 1. Si es un objeto y tiene una propiedad 'name' (como a veces pasa con entidades @sys.person).
        if (personObject && typeof personObject === 'object' && personObject.name) {
            personName = personObject.name;
        // 2. Si es una cadena simple y no está vacía (como a veces pasa con entidades o texto libre).
        } else if (typeof personObject === 'string' && personObject !== '') {
            personName = personObject;
        } else {
            // Si el parámetro no tiene el formato esperado, registra una advertencia.
            console.warn("El parámetro 'person' no es un objeto con 'name' ni una cadena simple con valor:", personObject);
        }

        // Si se pudo extraer un nombre, personaliza el saludo.
        if (personName) {
            agent.add(`¡Hola, ${personName}! Es un placer saludarte desde el webhook.`);
        } else {
            // Si no se encontró un nombre, usa un saludo genérico.
            agent.add('¡Hola! Es un placer saludarte desde el webhook.');
        }
    }

    // --- Función ASÍNCRONA para Llamar a la API del Agente Python (Flask) ---
    // Esta es la función clave para integrar el cerebro de IA de tu proyecto.
    async function langchainAgent(agent) {
        // Obtiene la consulta de texto original del usuario desde Dialogflow.
        const userQuery = agent.query; 
        // Obtiene todos los parámetros extraídos por Dialogflow para este Intent.
        const dialogflowParameters = agent.parameters;

        console.log(`Intent para Agente LangChain activado. Pregunta del usuario: "${userQuery}"`);
        // Imprime los parámetros en formato JSON para facilitar la lectura en los logs.
        console.log("Parámetros de Dialogflow:", JSON.stringify(dialogflowParameters, null, 2));

        // Validación: Asegura que la URL del agente Python esté configurada en .env.
        if (!FASTAPI_API_URL) {
            console.error("ERROR: FASTAPI_LANGCHAIN_API_URL no está configurada en .env");
            agent.add("Lo siento, aun no tenemos información disponible."); // Mensaje al usuario si la URL falta.
            return; // Termina la ejecución de la función.
        }

        try {
            // --- Petición POST a la API Python (Flask) usando Axios ---
            const response = await axios.post(FASTAPI_API_URL, { // URL del agente Python
                // Cuerpo de la petición JSON que se enviará al agente Python:
                query: userQuery,             // La pregunta del usuario
                parameters: dialogflowParameters // Los parámetros de Dialogflow
            }, {
                // Encabezados HTTP: Crucial para indicar que el cuerpo de la petición es JSON.
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // `response.data` contiene el cuerpo de la respuesta JSON que el agente Python envió.
            // Axios automáticamente parsea la respuesta JSON en un objeto JavaScript.
            const apiResponse = response.data; 

            // --- Procesamiento de la Respuesta del Agente Python ---
            // Se espera que el agente Python devuelva un JSON con una clave 'answer'.
            if (apiResponse && typeof apiResponse.answer === 'string' && apiResponse.answer.length > 0) {
                // Si la respuesta es válida, se la envía de vuelta a Dialogflow.
                agent.add(apiResponse.answer); 
                console.log("Respuesta de la API de FastAPI (ahora Flask) enviada a Dialogflow:", apiResponse.answer);
            } else {
                // Si la respuesta no tiene el formato esperado, se envía un mensaje de error genérico.
                agent.add("No pude obtener una respuesta clara del sistema de información. ¿Podrías intentar de otra forma?");
                console.warn("La API de FastAPI (ahora Flask) no devolvió la clave 'answer' esperada o está vacía:", apiResponse);
            }

        } catch (error) {
            // --- Manejo de Errores de la Petición a la API Python ---
            console.error("Error al llamar a la API de FastAPI (ahora Flask):", error.message);

            // Determina el tipo de error y proporciona un mensaje más específico al usuario.
            if (error.response) {
                // Error recibido con una respuesta HTTP (ej. 400, 404, 500)
                console.error("Respuesta de error de Flask:", error.response.data);
                if (error.response.status === 404) {
                    agent.add("Lo siento, no pude conectar con el servicio de información (error 404). Asegúrate de que la URL sea correcta y el servicio esté en línea.");
                } else if (error.response.status === 500) {
                    agent.add("Hubo un error interno en el servicio de información. Por favor, intenta de nuevo o contacta al soporte.");
                } else {
                    agent.add(`Hubo un problema (${error.response.status}) al procesar tu solicitud con el sistema de información. Intenta de nuevo.`);
                }
            } else {
                // Error sin respuesta HTTP (ej. el servidor Python no está corriendo, problema de red)
                agent.add("Lo siento, no pude contactar el sistema de información. Verifica tu conexión o intenta más tarde.");
            }
        }
    }


    //Prueba con OpenIA para dialogflow
    
    /*async function generateFallbackResponseWithOpenAI(agent, userQuery) {
    try {
      const fallbackPrompt = `Responde brevemente a la siguiente pregunta del usuario de manera amigable. La pregunta fue: "${userQuery}"`;
      const chatCompletion = await openai.chat.completions.create({
        model: "o4-mini",
        messages: [
          { role: "system", content: "Eres un asistente amable y servicial para glampings, que puede ofrecer respuestas simples." },
          { role: "user", content: fallbackPrompt }
        ],
        temperature: 0.5,
        max_tokens: 100,
      });
      const openAIResponse = chatCompletion.choices[0].message.content;
      agent.add(`Hmm, no tengo esa información específica, pero puedo decirte esto: ${openAIResponse}`);
      console.log("Respuesta de fallback generada con OpenAI:", openAIResponse);
    } catch (fallbackOpenAIError) {
      console.error("Error al generar respuesta de fallback con OpenAI:", fallbackOpenAIError.message);
      agent.add("Lo siento, tuve un problema para procesar tu solicitud.");
    }
  }*/




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
    //intentMap.set('generateFallbackResponseWithOpenAI', generateFallbackResponseWithOpenAI); // Mapea el Intent de Dialogflow a tu función 'generateFallbackResponseWithOpenAI'
    
    
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
    console.log(`URL del agente Python Flask: ${FASTAPI_API_URL}`);
    
});//puerto de escucha