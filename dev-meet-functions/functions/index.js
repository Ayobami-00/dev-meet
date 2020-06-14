const functions = require("firebase-functions");
const admin = require("firebase-admin");

const app = require("express")();

admin.initializeApp();

const config = {
  apiKey: "AIzaSyBk-uK9C2nWAv5wFk9L4zqovVI2FZmWXKM",
  authDomain: "socialmediaapp-bc79c.firebaseapp.com",
  databaseURL: "https://socialmediaapp-bc79c.firebaseio.com",
  projectId: "socialmediaapp-bc79c",
  storageBucket: "socialmediaapp-bc79c.appspot.com",
  messagingSenderId: "254859136004",
  appId: "1:254859136004:web:dfe6364750982935f27951",
  measurementId: "G-GY9MVVDRSH",
};

const firebase = require("firebase");
firebase.initializeApp(config);

const db = admin.firestore();

app.get("/screams", (request, response) => {
  db.collection("screams")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let screams = [];
      data.forEach((doc) => {
        screams.push({
          screamId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
        });
      });

      return response.json(screams);
    })

    .catch((error) => console.error(err));
});

app.post("/scream", (request, response) => {
  const newScream = {
    body: request.body.body,
    userHandle: request.body.userHandle,
    createdAt: new Date().toISOString(),
  };

  db.collection("screams")
    .add(newScream)
    .then((doc) => {
      return response.json({
        message: `document ${doc.id} created successfully`,
      });
    })
    .catch((error) => {
      //Server-error
      response.status(500).json({ error: "Something went wrong" });
      console.error(error);
    });
});


const isEmail =(email) => {
    const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if(email.match(regEx)) return true;
    else return false;
}
const isEmpty = (string) => {
    if(string.trim() === '') return true;
    else return false;
}


//Sign up route
app.post("/signup", (request, response) => {
  const newUser = {
    email: request.body.email,
    password: request.body.password,
    confirmPassword: request.body.confirmPassword,
    handle: request.body.handle,
  };

  errors = {};
  if(isEmpty(newUser.email)){
      errors.email = 'Must not be empty'
  } else if(!isEmail(newUser.email)){
      errors.email = "Must be a valid email address"
  }

  if(isEmpty(newUser.password)) errors.password = 'Must not be empty'
  //TODO: Fix issue with the code below.S
  if(newUser.password != newUser.confirmPassword) errors.confirmPassword = 'Passwords must match';
  if(isEmpty(newUser.handle)) errors.handle = 'Must not be empty'

  if(Object.keys(errors).length > 0) return response.status(400).json(errors);

  // TOOD: validate data
  let token, userId;
  db.doc('/users/${newuser.handle}').get()
  .then(doc => {
      if(doc.exists){
          return response.status(400).json({ handle: 'This handle is already taken'});
      }else{
          return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
  })
  .then(data =>{
      userId = data.user.uid
      return data.user.getIdToken();
  })
  .then((idToken) =>{
      token = idToken
      const userCredentials = {
          handle: newUser.handle,
          email: newUser.email,
          createdAt: new Date().toISOString(), 
          userId
      };
      return db.doc(`/users/${newUser.handle}`).set(userCredentials);
  })
  .then(()=>{
      return response.status(201).json({ token });
  })
  .catch(error=>{
      console.error(error);
      if(error.code == "auth/email-already-in-use"){
          return response.status(400).json({email: 'Email is already in use'})
      } else{
        response.status(500).json({error: error.code});
      }
     
  })

  app.post('/login',(request,response)=>{
      const user = {
          email: request.body.email,
          password: request.body.password
      };

      let erros = {}

      if(isEmpty(user.email)) errors.email = 'Must not be empty';
      if(isEmpty(user.password)) errors.password = 'Must not be empty';

      if(Object.keys(erros).length > 0) return response.status(400).json(errors);
      
      firebase.auth().signInWithEmailAndPassword(user.email,user.password)
      .then(data =>{
          return data.user.getIdToken();
      })
      .then(token=> {
          return response.json({token});
      })
      .catch((error)=>{
          console.error(error);
          return response.status(500).json({error: error.code})
      })


  })

});
exports.api = functions.https.onRequest(app);
