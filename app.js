const http = require("http");
const fs = require("fs");
const url = require("url");
const querystring = require("querystring");


const users = {}; 
const shortUrls = {};

// Utils
function serveFile(res, filepath) {
  fs.readFile(filepath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end("Server error");
    } else {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(data);
    }
  });
}

function parseFormData(req, callback) {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => callback(querystring.parse(body)));
}

function parseJson(req, callback) {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => callback(JSON.parse(body)));
}

function generateShortcode(length = 5) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function isValidUrl(str) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}


const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toLowerCase();

  
  if (pathname === "/register" && method === "get") {
    serveFile(res, "./public/register.html");
  }

  else if (pathname === "/register" && method === "post") {
    parseFormData(req, (data) => {
      const { username, password } = data;
      if (users[username]) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Username already exists");
      } else {
        users[username] = password;
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Registration successful");
      }
    });
  }

 
  else if (pathname === "/login" && method === "get") {
    serveFile(res, "./public/login.html");
  }

  
  else if (pathname === "/login" && method === "post") {
    parseFormData(req, (data) => {
      const { username, password } = data;
      if (users[username] && users[username] === password) {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Login successful");
      } else {
        res.writeHead(401, { "Content-Type": "text/plain" });
        res.end("Invalid credentials");
      }
    });
  }





  
  else if (pathname === "/shorturls" && method === "post") {
    parseJson(req, (data) => {
      const { url: longUrl, validity = 30, shortcode } = data;

      if (!longUrl || !isValidUrl(longUrl)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Invalid URL" }));
      }

      let finalCode = shortcode;

      if (!finalCode || shortUrls[finalCode]) {
        do {
          finalCode = generateShortcode();
        } while (shortUrls[finalCode]);
      }

      const expiry = new Date(Date.now() + validity * 60 * 1000).toISOString();
      shortUrls[finalCode] = {
        url: longUrl,
        expiry,
        createdAt: new Date().toISOString(),
        clicks: 0,
        clickLogs: [],
      };

      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          shortLink: `https://hostname:port/${finalCode}`,
          expiry: expiry,
        })
      );
    });
  }




  
  else if (method === "get" && pathname.length > 1) {
    const code = pathname.slice(1); // remove leading "/"
    const entry = shortUrls[code];

    if (entry) {
      const now = new Date();
      const expiryDate = new Date(entry.expiry);
      if (now < expiryDate) {
        entry.clicks += 1;
        entry.clickLogs.push({
          timestamp: new Date().toISOString(),
          referer: req.headers["referer"] || "direct",
          location: "Unknown", // placeholder
        });

        res.writeHead(302, { Location: entry.url });
        res.end();
      } else {
        res.writeHead(410, { "Content-Type": "text/plain" }); // Gone
        res.end("Link has expired");
      }
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Short URL not found");
    }
  } else if (method === "get" && pathname.startsWith("/shorturls/")) {
    const shortcode = pathname.split("/")[2];
    const entry = shortUrls[shortcode];

    if (!entry) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Shortcode not found" }));
    }

    const stats = {
      shortLink: `https://hostname:port/${shortcode}`,
      originalUrl: entry.url,
      createdAt: entry.createdAt,
      expiry: entry.expiry,
      totalClicks: entry.clicks,
      clicks: entry.clickLogs,
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(stats, null, 2));
  }

  
  else if(pathname==='/'){
    serveFile(res,"./public/index.html");
     if(pathname==='/favicn.ico'){
      serveFile(res,"./public/favicon.ico");
    }
  }

  else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
  }
});


server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});