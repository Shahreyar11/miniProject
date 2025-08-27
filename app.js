const express = require('express');
const app = express();
const userModel = require('./models/user');
const postModel = require('./models/post');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const post = require('./models/post');


app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());

app.get("/", (req, res) => {
    res.render("index");
})

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/profile", isLoggedIn, async (req,res) => {
    let user = await userModel.findOne({email: req.user.email}).populate("posts") 
     // So this gives you all the user data and if you want specific data you need to select like .select("name email")
    res.render("profile", {user});
})

app.get("/like/:id", isLoggedIn, async (req,res) => {
    let post = await postModel.findOne({_id: req.params.id}).populate("user"); 
    if(post.likes.indexOf(req.user.userid) === -1){
        post.likes.push(req.user.userid);
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }
    await post.save();
    res.redirect("/profile");
})

app.post("/post", isLoggedIn, async (req,res) => {
    let user = await userModel.findOne({email: req.user.email}) 
    let {content} = req.body;

    let post = await postModel.create({
        user: user._id,
        content: content
    });

    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile");
});


app.post("/register", async (req, res) => {
    let {username, name, age, email, password} = req.body;
    let user = await userModel.findOne({email}) // Go into the 
    //users collection in MongoDB, find one document where the email field matches
    // the value provide by the user on the login form
    
    if(user) return res.status(500).send("User Already Registered");
    
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let user = await userModel.create({
                username,
                email,
                age,
                name,
                password: hash

            })

            let token = jwt.sign({email: email, userid: user._id}, "secretkey");
            res.cookie("token", token);
            res.send("registered");
        })
    })
})



app.post("/login", async (req, res) => {
    let {email, password} = req.body;
    let user = await userModel.findOne({email})
    if(!user) return res.status(500).send("Something Went Wrong");

    bcrypt.compare(password, user.password, function(err, result){  
        // here user.password is the hashed password saved in MongoDb from which we are comparing
        if(result) {
            let token = jwt.sign({email: email, userid: user._id}, "secretkey");
            res.cookie("token", token);
            res.redirect("profile");
        }
        else res.redirect("/login");
    })
    
});

app.get("/logout", (req, res) => {
    res.cookie("token", "");
    res.redirect("/login");
});

function isLoggedIn(req, res, next){
    if(req.cookies.token === "") res.redirect("/login");
    else{
        let data = jwt.verify(req.cookies.token, "secretkey");
        req.user = data;
    }
    next();
}




app.listen(3000);