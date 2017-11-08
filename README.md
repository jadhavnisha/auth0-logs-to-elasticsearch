# auth0-logs-to-elasticsearch

This extension will take all of your Auth0 logs and export them to Elasticsearch.

# Configuaration

 Clone this code to your machine
 
 From terminal `npm install`
 
 Configure required environment variable in `.env` file such as Auth0 and ElasticSearch details
 
 `nodemon index.js` for running in development mode

 Note: We have implemented schedular, for now schedular will execute this code after every 1 minute.
