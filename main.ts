import express from "express";
import { Request, Response } from "express";
import path from "path";
import session, { MemoryStore } from 'express-session'
import setting from './setting.json'
import jsonfile from 'jsonfile'
import fs from 'fs'
import pfs from 'fs/promises'
import dayjs from 'dayjs'
import formidable from 'formidable'

declare module 'express-session' {
    interface SessionData {
        counter: number
        // username: string
        // password: string
    }
    interface Session {
        user: boolean;
    }
}
type Memo = {
    id:number,
    content: string,
    image?: string,
}
type User = {
    username:string,
    password:string,
}
async function loadMemos(): Promise<Memo[]> {
    let files = await pfs.readdir('.')
    if (files.includes('memos.json')) {
        let json = await jsonfile.readFile('memos.json');
        return json
    }
    return []
}

async function loadLoginInfo(): Promise<User[]> {
    let loginJson = await jsonfile.readFile('users.json');
    return loginJson;
}

async function saveMemos(memos: Memo[]) {
    await jsonfile.writeFile('memos.json', memos)
}
const isLoggedIn = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.log("user", req.session?.user)
    if (req.session?.user) {
      //called Next here
      next();
    } else {
      // redirect to index page
      res.redirect("/index.html")
    }
};

function loginCheck(username:string, password:string, loginInfo: User[]) {
    let loginFlag = false;
    // console.log(`incoming: ${username}, ${password}`)
    loginInfo.forEach(info => {
        
        // console.log(`matching: ${info.username}, ${info.password}`)
        if (username == info.username && password == info.password) loginFlag = true;
        return;
    })
    return loginFlag;
}

let uploadDir = 'uploads'
const form = formidable({
    uploadDir,
    keepExtensions: true,
    maxFiles: 1,
    maxFileSize: (1024 ** 2) * 20000, // the default limit is 1KB * 200
    filter: (part) => part.mimetype?.startsWith("image/") || false,
});

async function main() {
    let memos: Memo[] = await loadMemos();
    // let memos = [{"id":0,"content":"我愛香港"}]
    let loginInfo = await loadLoginInfo();
    let nextId = memos.length + 1;
    const app = express();

    fs.mkdirSync(uploadDir, { recursive: true});


    app.use('/uploads', express.static(uploadDir))
    // post method for multipart form submission
    app.post('/memoImage', (req, res) => {
        form.parse(req, (err, fields, files) => {
            // console.log("upload image", files);
            // res.status(501);
            console.log(" file uploading from browser");
            res.end("file uploaded!")

        });
    }) 


    // urlencoded is the middleware parsing the incoming request body
    app.use(express.urlencoded());

    app.use(
        session({
            resave: false,
            saveUninitialized: false,
            secret: setting.sessionSecret,            
        }),
    );

    app.use('/admin',isLoggedIn, express.static("protected"));
    // app.use('/', express.static("public"));

    app.use((req, res, next) => {
        if(req.url.endsWith('.html') || req.url == '/'){
            
            let counter = req.session.counter || 0;
            counter++;
            req.session.counter = counter;
            req.session.save();
        }   
        next(); 
    })
    app.use((req, res, next) => {
        let timestamp = dayjs().format('HH:mm:ss')
        if(req.url.endsWith('.html') || req.url.endsWith('/')) {
            console.log(`[${timestamp}]`, "request:", req.url, `(${req.session.counter})`);
        }
        next();
    })
    
    app.use('/', express.static("public"));

    app.get('/counter.js', (req,res) => {
        res.header('Content-Type', 'text/javascript')
        res.end(
        `let counter =  ${req.session.counter};
        console.log("counter.js is being called");`);
    })
    app.get('/memos.js', (req, res) => {
        res.header('Content-Type', 'text/javascript')
        res.end(
        `
        let memos = ${JSON.stringify(memos)}
        console.log(memos);
        console.log("memos is being called")`) 
    })

    app.get("/home", function (req: Request, res: Response) {
        res.end("This is home for testing");
    });

    /* Server CRUD starts here */

    // GET all memos (Retrieval)
    app.get('/memos', (req, res) => {
        let timestamp = dayjs().format('HH:mm:ss');
        console.log(`[${timestamp}] get memos json`);
        res.json(memos);
    })
    // POST a new login
    app.post('/login', (req, res) => {
        if (loginCheck(req.body.email, req.body.password, loginInfo)) {
            console.log("login success");
            req.session.user = true;
            req.session.save();
            res.redirect("/admin")
        } else {
            req.session.user = false;
            console.log("login fail")
            res.end("trying to login fail")
        }
        
    })
    
    // POST a new memo (Create)
    app.post('/memos', async (req, res) => {
        let timestamp = dayjs().format('HH:mm:ss')
        console.log(`[${timestamp}] post a new memo id: ${nextId}(${req.body.content})`)
        memos.push({
            id: nextId,
            content: req.body.content,
            image: "",
        })
        nextId++;
        try {
            await saveMemos(memos);
            res.status(201)
            res.end("saved new memo");
        } catch (error) {
            res.status(507);
            res.end('failed to save new memo: ' + error)
        }
        res.end("trying to post a new memo");

    })



    // 404 not found
    app.use((req, res) => {
        res.status(404);
        res.sendFile(path.resolve('public', '404.html'))
    })

    const PORT = 8080;

    app.listen(PORT, () => {
    console.log(`Listening at http://localhost:${PORT}/`);
    });

}

main().catch(e => console.error(e))