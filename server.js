"use strict";

var express = require("express");
var mongo = require("mongodb");
var mongoose = require("mongoose");
const bodyParser = require("body-parser");

var cors = require("cors");
const dns = require("dns");

var app = express();

// Basic Configuration
var port = process.env.PORT || 3000;

//////////////////////////////////MONGO CONNECTION USING MONGOOSE ODM//////////////////////////////////////

mongoose.connect(process.env.URL, {
  useUnifiedTopology: true,
  useNewUrlParser: true
});
/////////////////////////// schema for url//////////a number against the URL given......////////////////////////////////
const mySchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});
////////////////////////////////////APPLY schema into model/////////////////////////////////////////////////
const ShortUrl = mongoose.model("ShortUrl", mySchema);

app.use(cors());

//////////////////////Use body parser to get the data from POST method request body////////////////////////////////
app.use(bodyParser.urlencoded({ extended: false }));
// you should mount the body-parser here

app.use("/public", express.static(process.cwd() + "/public"));

app.get("/", function(req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// your first API endpoint...
app.get("/api/hello", function(req, res) {
  res.json({ greeting: "hello API" });
});

////////////////input is FULL URL,,,,,output is one already available FULL & SHORT URLs from MONGO//////////////////////////////
const findOneByOrginalUrl = (url, done) => {
  ShortUrl.findOne({ original_url: url }, (err, data) => {
    err ? done(err) : done(null, data);
  });
};

////////////////input is SHORT URL,,,,,output is one already shortened URL//////////////////////////////
const findOneByShortUrl = (shortUrl, done) => {
  ShortUrl.findOne({ short_url: shortUrl }, (err, data) => {
    err ? done(err) : done(null, data);
  });
};

/////////////////////////////////////////////////////////// create SHORT URL and save//////////////////////////////
const createAndSaveUrl = (url, done) => {
  ShortUrl.count((err, documentsCount) => {
    err ? done(err) : "";
    //////////////////insert a new document to collection, save it and respond it back///////////////////////////////////
    new ShortUrl({
      original_url: url,
      short_url: documentsCount === 0 ? 1 : ++documentsCount
    }).save((err, doc) => {
      err ? done(err) : "";
      done(null, {
        original_url: doc.original_url,
        short_url: doc.short_url
      });
    });
  });
};
//////////////////////TEST the URL is valid///////////////////////////////////////////////////////////
const testValidUrl = (url, done) => {
  if (/^https?:\/\/(w{3}.)?[\w-]+.com(\/\w+)*/.test(url)) {
    dns.lookup(url.replace(/^https?:\/\//, ""), (err, address, family) => {
      err ? done(err) : done(null, address);
    });
  } else done(null, null);
};

////////////////////////ROUTE handler for /api/shorturl/new POST request////create a new one
app.post("/api/shorturl/new", (req, res) => {
  testValidUrl(req.body.url, (err, address) => {
    err ? res.send(err) : "";
    if (address == null) return res.json({ error: "invalid URL" });

    findOneByOrginalUrl(req.body.url, (err, data) => {
      err ? res.send(err) : "";
      // if url exists alredy
      if (data) {
        res.json({
          original_url: data.original_url,
          short_url: data.short_url
        });
      } else {
        createAndSaveUrl(req.body.url, (err, document) => {
          err ? res.send(err) : "";
          res.json(document);
        });
      }
    });
  });
});
////////////////////////ROUTE handler for /api/shorturl/123 GET request/////Serve the existing URL if present in DB
app.get("/api/shorturl/:shortUrl", (req, res) => {
  findOneByShortUrl(req.params.shortUrl, (err, document) => {
    err ? res.send(err) : "";
    document == null
      ? res.json({ error: "invalid short URL given" })
      : res.redirect(document.original_url);
  });
});

app.listen(port, function() {
  console.log("Node.js listening ...");
});
