require('dotenv').config()
const schedule = require('node-schedule');
const Promise = require("bluebird");
const ManagementClient = Promise.promisifyAll(require('auth0')).ManagementClient;
const elasticsearch = Promise.promisifyAll(require('elasticsearch'));
const fs = Promise.promisifyAll(require('fs'));

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET
const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL
const ELASTICSEARCH_INDEX = process.env.ELASTICSEARCH_INDEX

const management = new ManagementClient({
  domain: `${AUTH0_DOMAIN}.auth0.com`,
  clientId: AUTH0_CLIENT_ID,
  clientSecret: AUTH0_CLIENT_SECRET,
  scope: "read:logs",	 
});

const esclient = new elasticsearch.Client({
  host: ELASTICSEARCH_URL,
  log: 'trace'
});


function processLogs(){
  var lastCheckPoint = null;

  fs.readFileAsync('lastCheckPoint.txt',{encoding: 'utf8'})
    .then(function(data) {
      lastCheckPoint = data;  
      console.log('last check point >>>>>', lastCheckPoint);
      getLogsFromAuth0(lastCheckPoint)
    })
    .catch(function(err){
      console.log(err);
      getLogsFromAuth0(lastCheckPoint);
    });
}

function getLogsFromAuth0(lastCheckPoint){
  var take = 100;

  management.getLogs({take: take, from: lastCheckPoint, per_page: take, sort: 'date:1'})
    .then(function(logs){
      var bulk_logs = [];
      if (logs && logs.length) {
        bulk_logs = buildBulkLogs(logs)
        lastCheckPoint = logs[logs.length-1].log_id
        pushToElasticSearch(bulk_logs, lastCheckPoint);
        processLogs();                
      }
    })
    .catch(function(err){
      console.log('error from auth0'+err);
    });
}

function buildBulkLogs(logs){
  var bulk_logs = [];
  for (let i=0; i<logs.length; i++) {
    bulk_logs.push({index: {_index: ELASTICSEARCH_INDEX, _type: ELASTICSEARCH_INDEX, _id: logs[i]._id}});
    delete(logs[i]['_id'])
    bulk_logs.push(logs[i]);
  }
  return bulk_logs;
}

function pushToElasticSearch(bulk_logs, lastCheckPoint){
  esclient.bulk({body: bulk_logs})
    .then(function(response){
       return fs.writeFileAsync('lastCheckPoint.txt', lastCheckPoint);
    })
    .then(function(){
      console.log('The file has been saved!');      
      return esclient.count({index: ELASTICSEARCH_INDEX})              
    })
    .then(function(response, status) {
      console.log('Number for records for index '+response.count);
      // processLogs()
    })
    .catch(function(err){
      console.log('error from ES push '+err);
    });
}

schedule.scheduleJob('*/1 * * * *', function(){
  console.log('Started schedule');
  processLogs(); 
});
