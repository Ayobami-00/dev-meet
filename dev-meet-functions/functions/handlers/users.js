const { admin , db } = require("../util/admin");
const config = require("../util/config");
const firebase = require("firebase");
firebase.initializeApp(config);
const { validateSignUpData, validateLoginData, reduceUserDetails } = require("../util/validators");

// Sign user up
exports.signup = (request, response) => {
  const newUser = {
    email: request.body.email,
    password: request.body.password,
    confirmPassword: request.body.confirmPassword,
    handle: request.body.handle,
  };

  const { valid, errors } = validateSignUpData(newUser);

  if (!valid) return response.status(400).json(errors);

  const noImg = 'no-img.png'

  let token, userId;
  db.doc(`/users/${newUser.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return response
          .status(400)
          .json({ handle: "This handle is already taken" });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then((data) => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then((idToken) => {
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
        userId,
      };
      return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
      return response.status(201).json({ token });
    })
    .catch((error) => {
      console.error(error);
      if (error.code == "auth/email-already-in-use") {
        return response.status(400).json({ email: "Email is already in use" });
      } else {
        response.status(500).json({ error: error.code });
      }
    });
};

// Log user in 
exports.login = (request, response) => {
  const user = {
    email: request.body.email,
    password: request.body.password,
  };

  const { valid, errors } = validateLoginData(user);

  if (!valid) return response.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then((data) => {
      return data.user.getIdToken();
    })
    .then((token) => {
      return response.json({ token });
    })
    .catch((error) => {
      F;
      console.error(error);
      if (error.code == "auth/wrong-password") {
        return response
          .status(403)
          .json({ general: "Wrong credentials, please try again" });
      } else return response.status(500).json({ error: error.code });
    });
};


// Add user details
exports.addUserDetails = (request, response) => {
  let userDetails = reduceUserDetails(request.body);
  
  db.doc(`/users/${request.user.handle}`).update(userDetails)
  .then(() => {
    return response.json({message: 'Details added succesfully'})
  })
  .catch(error => {
    console.error(error);
    return res.status(500).json({error: error.code})
  })

}

// Get own user details
//fix userId in user details issue --- 
exports.getAuthenticatedUser = (request, response) => {
  let userData = {};
  db.doc(`/users/${request.user.handle}`).get()
  .then(doc => {
    if(doc.exists){
      userData.credentials = doc.data();
      return db.collection('likes').where('userHandle','==',request.user.handle).get()
    }
  })
  .then(data=>{
    userData.likes = [];
    data.forEach(doc => {
      userData.likes.push(doc.data());
    });
    return response.json(userData);
  })
  .catch(error => {
    console.error(error);
    return response.status(500).json({error: error.code});
  })
}
// Upload a profile image for user
exports.uploadImage = (request,response) => {
  const BusBoy = require('busboy');
  const path = require('path');
  const os = require('os');
  const fs = require('fs');

  const busboy = new BusBoy({headers: request.headers})

  let imageFileName;
  let imageToBeUploaded = {};

  busboy.on('file', (fieldname, file, filename,encoding, mimetype) => {
    if(mimetype != 'image/jpeg' && mimetype!= 'image/png'){
      return response.status(400).json({ error: 'Wrong file type submitted'});
    }
    const imageExtension = filename.split('.')[filename.split('.').length-1];
    imageFileName = `${Math.round(Math.random()*10000000)}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = {filepath, mimetype};
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on('finish', ()=>{
    admin.storage().bucket().upload(imageToBeUploaded.filepath, {
      resumable: false,
      metadata: {
        metadata : {
          contentType: imageToBeUploaded.mimetype
        }
      }
    })
    .then(()=>{
      const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`
      return db.doc(`/users/${request.user.handle}`).update({imageUrl});
    })
    .then(()=>{
      return response.json({message: "Image uploaded successfully"});
    })
    .catch(error =>{
      console.error(error);
      return response.status(500).json({error: error.code});
    })
  });
  busboy.end(request.rawBody);
};