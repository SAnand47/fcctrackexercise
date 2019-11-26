const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const shortId = require("shortid");

const cors = require("cors");

const mongoose = require("mongoose");
mongoose.connect(
  process.env.MLAB_URI
);

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use("/public", express.static(process.cwd() + "/public"));

//--get the mongo db schema
//-- schema for create user - username and userid
const schema = mongoose.Schema;

const createUserSchema = new schema({
  username: { type: String, required: true },
  userid: { type: String }
});
const User = mongoose.model("User", createUserSchema);

//-- check the mongodb database with sample data
//-- create the user exercise log schema

const userLogSchema = new schema({
  userid: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date }
});
const Userlog = mongoose.model("Userlog", userLogSchema);

//--------------------------------------------------------------------------------------//

//-- all the routes
//-- initial webpage load
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

//-- create user entry form POST
app.post("/api/exercise/new-user", function(req, res) {
  //res.send(req.body.username) //-- for testing
  var userenteredName = req.body.username;
  //-- find if the user exists and if not add to the User model collection
  User.findOne({ username: userenteredName }, (err, data) => {
    if (err) return res.send("error while searching for user in database");
    if (data) {
      return res.send("username already taken");
    } //user exists
    if (!data) {
      var newUser = new User({
        username: userenteredName,
        userid: shortId.generate()
      });
      newUser.save((err, result) => {
        if (err)
          return res.send("issue in saving data to user collection database");
        return res.json({ username: userenteredName, _id: result.userid });
      });
    }
  });
});

//-- user exercise log entry form POST
//console.log(new Date("2019-45784-19"));

app.post("/api/exercise/add", function(req, res) {
  var userOnRecord = "";
  //console.log(req.body.date)
  User.findOne({ userid: req.body.userId }, (err, data) => {
    if (err) return res.send("error in searching for username in database");
    if (!data) return res.send("unknown _id");
    if (data) {
      userOnRecord = data.username;
      if (!req.body.description) {
        return res.send("Path `description` is required.");
      }
      if (!req.body.duration) {
        return res.send("Path `duration` is required.");
      }
      if (req.body.date && new Date(req.body.date) == "Invalid Date") {
        return res.send(
          `Cast to Date failed for value "${req.body.date}" at path "date"`
        );
      }
      var newLog = new Userlog({
        userid: req.body.userId,
        description: req.body.description,
        duration: req.body.duration,
        date: req.body.date ? new Date(req.body.date) : new Date()
      });
      newLog.save((err, result) => {
        if (err) return res.send("error in saving userlog to database");
        // console.log((result.date).toDateString().replace(',',''))
        var arr = result.date
          .toUTCString()
          .slice(0, 16)
          .replace(",", "")
          .split(" ");
        return res.json({
          username: userOnRecord,
          description: result.description,
          duration: result.duration,
          _id: result.userid,
          date: arr[0] + " " + arr[2] + " " + arr[1] + " " + arr[3]
        });
      });
    }
  });
});

//--get user exercise log API

app.get("/api/exercise/log", function(req, res) {
  const { userId, limit, from, to } = req.query;
  var query;
  // var limt =limit
  if (!userId) {
    return res.send("unknown userId");
  }

  //-- check validity of from and to dates
  var fromStat = from && new Date(from) != "Invalid Date";
  var toStat = to && new Date(to) != "Invalid Date";

  if (fromStat && toStat) {
    query = Userlog.find({
      userid: userId,
      date: { $gt: new Date(from), $lt: new Date(to) }
    });
  }

  if (fromStat && !toStat) {
    query = Userlog.find({ userid: userId, date: { $gt: new Date(from) } });
  }

  if (!fromStat && toStat) {
    query = Userlog.find({ userid: userId, date: { $lt: new Date(to) } });
  }

  if (!fromStat && !toStat) {
    query = Userlog.find({ userid: userId });
  }

  User.findOne({ userid: userId},(err,doc) =>{
    //  console.log(doc);
      if(err){return res.send("error in finding userId in User database")}
      if (!doc){return res.send("unknown userId")}
      if (doc){
      query
        .sort({ date: "descending" })
        .select({ _id: false, userid: false, __v: false })
        .exec((err, data) => {
          //console.log(limit);
          if (err)
            return res.send("error in finding documents in userlog database");
          if (data) {
            if (Number(limit) && limit <= data.length) {
              return res.json({
                _id: userId,
                username: doc.username,
                from: from,
                to: to,
                count: limit,
                log: dataArr(data).slice(0, limit)
              });
            }

            return res.json({
              _id: userId,
              username: doc.username,
              from: from,
              to: to,
              count: data.length,
              log: dataArr(data)
            });
          }
          if (!data) {
            return res.json({
              _id: userId,
              username: doc.username,
              from: from,
              to: to,
              count: 0,
              log: []
            });
          }
        });
      }
    });
});

var dataArr = function(arr1) {
  return arr1.map(val => {
    let subArr1 = val.date
      .toUTCString()
      .slice(0, 16)
      .replace(",", "")
      .split(" ");
    let str =
      subArr1[0] + " " + subArr1[2] + " " + subArr1[1] + " " + subArr1[3];
    let obj = { description: val.description, duration: val.duration, date: str };
    return obj;
  });
};

//--get all the users

app.get("/api/exercise/users", function(req, res) {
  User.find({}).select({_id:false}).exec((err, data) => {
    if (err) return "error while finding data in User database";
    if (data) {
      // console.log(data);
      return res.json(data);
    }
    if (!data) {
      return res.send("no data found in User database");
    }
  });
});

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});