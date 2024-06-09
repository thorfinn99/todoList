const express = require('express')
const app = express()
const path = require('path')
const fs = require("fs")
const userModel = require("./models/user")
const postModel = require("./models/post")
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const upload = require("./configs/multerconfig")

app.set("view engine", 'ejs')
app.use(express.json())
app.use(express.urlencoded({ extended:true }))
app.use(express.static(path.join(__dirname, "public")))
app.use(cookieParser())


app.get("/profile/upload", (req,res)=> {
    res.render("profileupload")
})
app.post("/upload", isLoggedIn, upload.single("image"), async (req,res)=> {
    let user = await userModel.findOne({email: req.user.email});
    user.profilepic = req.file.filename
    await user.save()
    res.redirect('/profile')
})
app.get('/create', (req,res)=> {
    res.render('index')
})
app.get('/login', (req,res)=> {
    res.render('login')
})
app.get('/logout', (req,res)=> {
    res.clearCookie("token")
    res.redirect('/login')
})
app.get('/profile', isLoggedIn, async (req,res)=> {
    let user = await userModel.findOne({email: req.user.email}).populate("posts")
    res.render('profile', {user})
})
app.get('/like/:id', isLoggedIn, async (req,res)=> {
    let post = await postModel.findOne({_id: req.params.id}).populate("user")

    if(post.likes.indexOf(req.user.userId) === -1 ){
        post.likes.push(req.user.userId)
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.userId), 1)
    }
    await post.save()
    res.redirect('/profile')
})
app.get('/edit/:id', isLoggedIn, async (req,res)=> {
    let post = await postModel.findOne({_id: req.params.id}).populate("user")
    res.render('edit', {post} )
})
app.post('/update/:id', isLoggedIn, async (req,res)=> {
    let post = await postModel.findOneAndUpdate({_id: req.params.id},{content: req.body.content})
    res.redirect('/profile' )
})

app.post('/post', isLoggedIn, async (req,res)=> {
    let user = await userModel.findOne({email: req.user.email})
    let {content} = req.body
    let post = await postModel.create({
        user: user._id,
        content,
    })
    user.posts.push(post._id)
    await user.save()
    res.redirect('/profile')
})

app.post('/register', async (req,res)=> {
    let {email, name, username, password, age} = req.body
    let user = await userModel.findOne({email})
    if (user) return res.status(500).send("User Already Exist")
    
        else {
            let user = await userModel.create({
                username,
                email,
                age,
                name,
                password,
            })
           let token = jwt.sign({email, userId: user._id}, "shhhh")
           res.cookie("token", token)
        }
        res.send("registered succesful")
})
app.post('/login', async (req,res)=> {
    let {email, password} = req.body
    let user = await userModel.findOne({email})

    if (!user){ return res.status(500).send("Something Went Wrong")}
    else if (password !== user.password ) { res.send('Something Went Wrong') } 
    else{
        let token = jwt.sign({email, userId: user._id}, "shhhh")
        res.cookie("token", token)
        res.status(200).redirect('/profile')
    }
})

function isLoggedIn(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).redirect('/login');
    }
    else {
        let data = jwt.verify(req.cookies.token, "shhhh")
        req.user = data
        next();
    }
}

app.listen(3000, ()=>{
    console.log("server is up");
})