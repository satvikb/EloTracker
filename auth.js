const request = require('request');
const requestPromise = require('request-promise');

let authCacheData = readJSONFile('private/authCache.json');

var latestEntitlements = ""
var latestToken = ""
var expireTime = 0

function readJSONFile(path){
  return JSON.parse(fs.readFileSync(path))
}

function getUserAuth(completion){
  let username = process.env.VAL_USERNAME
  let password = process.env.PASSWORD
  var userAuthCache = authCacheData[username]
  var expired = true;
  if(userAuthCache != undefined){
    var expireDate = userAuthCache["expiry"]
    var d = new Date();
    var seconds = Math.round(d.getTime() / 1000);
    if(seconds > expireDate){
      expired = true
    }else{
      expired = false
    }
  }

  if(userAuthCache != undefined && expired == false){
    let entitlementsToken = userAuthCache["entitlementsToken"];
    let accessToken = userAuthCache["accessToken"];
    let finalExpireTime = userAuthCache["expiry"];

    latestEntitlements = entitlementsToken
    latestToken = latestToken
    expireTime = finalExpireTime

    completion(entitlementsToken, accessToken)
  }else{
    // not found, get it

    var cookieJar = request.jar();
    var initialAuthOpts = {
      uri: 'https://auth.riotgames.com/api/v1/authorization',
      method: 'POST',
      json: {
        'client_id': 'play-valorant-web-prod',
        'nonce': '1',
        'redirect_uri': 'https://playvalorant.com/opt_in',
        'response_type': 'token id_token'
      },
      jar: cookieJar
    }

    request(initialAuthOpts, function(err, res, body) {

      initialAuthOpts.json = {
        'type': 'auth',
        'username': username,
        'password': password
      }
      initialAuthOpts.method = "PUT"
      request(initialAuthOpts, function(err1, res, body1) {
        if(body1["error"] != undefined){
          msg.channel.send("Bad username/password. Contact account owner.\nThe API might also be down.")
        }else{
          let returnData = body1["response"]["parameters"]["uri"]
          let rDS = returnData.split('#')[1];
          let params = querystring.parse(rDS)

          let accessToken = params["access_token"];
          let expireTime = params["expires_in"]; // TODO add to current time and store

          const entitlementsTokenOptions = {
              url: "https://entitlements.auth.riotgames.com/api/token/v1",
              method: 'POST',
              headers: {
                  'Authorization': 'Bearer '+accessToken,
                  "Content-Type": "application/json"
              },
              json:{},
              jar: cookieJar
          };
          request(entitlementsTokenOptions, function(err, res, body2) {
            var entitlementsToken = body2["entitlements_token"]

            const userInfoData = {
                url: "https://auth.riotgames.com/userinfo",
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer '+accessToken,
                    "Content-Type": "application/json"
                },
                json:{},
                jar: cookieJar
            };
            request(userInfoData, function(err, res, body3) {
              var userId = body3["sub"];
              var d = new Date();
              var seconds = Math.round(d.getTime() / 1000);
              var finalExpireTime = parseInt(expireTime) + seconds;
              var creds = {
                "userId":userId,
                "entitlementsToken":entitlementsToken,
                "accessToken":accessToken,
                "expiry":finalExpireTime
              }
              authCacheData[username] = creds;
              fs.writeFileSync('private/authCache.json', JSON.stringify(authCacheData, null, 2) , 'utf-8');

              latestEntitlements = entitlementsToken
              latestToken = latestToken
              expireTime = finalExpireTime

              completion(entitlementsToken, accessToken)
            });
          });
        }
      });
    });
  }
}

function requestOptions(url, ent, tok){
  const options = {
      url: url,
      method: 'GET',
      headers: {
          "Content-Type": "application/json",
          'Authorization': 'Bearer '+tok,
          'X-Riot-Entitlements-JWT': ent,
          'X-Riot-ClientPlatform':"ewogICAgInBsYXRmb3JtVHlwZSI6ICJQQyIsCiAgICAicGxhdGZvcm1PUyI6ICJXaW5kb3dzIiwKICAgICJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwKICAgICJwbGF0Zm9ybUNoaXBzZXQiOiAiVW5rbm93biIKfQ==",
          'X-Riot-ClientVersion':'release-02.03-shipping-8-521855'
      },
  }
  return options
}

function getRequest(url, completion, error){
  getUserAuth(function(ent, tok){
    let options = requestOptions(url, ent, tok)

    request(options, async function(err, res, body) {
      try{
        completion(JSON.parse(body))
      }catch(err2){
        error(err, err2)
      }
    })
  })
}

function getRequestPromise(url, ent, tok){
  return requestPromise(requestOptions(url, ent, tok))
}

function getRequestPromiseWithCompletion(url, completion){
  getUserAuth(function(ent, tok){
    completion(requestPromise(requestOptions(url, ent, tok)))
  })
}

modules.exports = {
  getLatestAuth: getUserAuth,
  getRequest: getRequest,
  getRequestPromise:getRequestPromise,
  getRequestPromiseWithCompletion:getRequestPromiseWithCompletion
}
