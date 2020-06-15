const { db } = require("../util/admin");
const { request } = require("express");

exports.getAllScreams = (request, response) => {
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
};

exports.postOneScream = (request, response) => {
  const newScream = {
    body: request.body.body,
    userHandle: request.user.handle,
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
};


// Fetch one scream
exports.getScream = (request, response) => {
  let screamData = {};
  db.doc(`/screams/${request.params.screamId}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return response.status(404).json({ error: "Scream not found" });
      }
      screamData = doc.data();
      screamData.screamId = doc.id;
      return db
        .collection("comments")
        .orderBy('createdAt','desc')
        .where("screamId", "==", request.params.screamId)
        .get();
    })
    .then(data => {
      screamData.comments = [];
      data.forEach((doc) => {
        screamData.comments.push(doc.data());
      });
      return response.json(screamData);
    })
    .catch((error) => {
      console.error(error);
      response.status(500).json({ error: error.code });
    });
};


// Comment on scream
exports.commentOnScream = (request,response) => {
  if(request.body.body.trim() == '') return response.status(400).json({ error: 'Must not be empty'});

  const newComment = {
    body: request.body.body,
    createdAt: new Date().toISOString(),
    screamId: request.params.screamId,
    userHandle: request.user.handle,
    userImage: request.user.imageUrl,
  };

  db.doc(`/screams/${request.params.screamId}`).get()
  .then(doc =>{
    if(!doc.exists){
      return response.status(404).json({error : 'Scream not found'});
    }
    return db.collection('comments').add(newComment)
  })
  .then(()=>{
    response.json(newComment);
  })
  .catch(error => {
    console.log(error);
    response.status(500).json({ error: 'Something went wrong'});
  })
}