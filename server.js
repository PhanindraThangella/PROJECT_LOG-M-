const express=require('express');
const bodyParser=require('body-parser');
const cors=require('cors');
const mongoose=require('mongoose');
const multer=require('multer');
const bcrypt=require('bcrypt');
const path=require('path');
const session=require('express-session');
const uuid=require('uuid');
const fs=require('fs');
const app=express()
app.use(express.static('public'));
app.use(express.static('public\HTML'));
app.use(express.static(path.join(__dirname,'public\UserImages')));
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(session({
    secret:'hello',
    saveUninitialized:false,
    resave:false,
}));
const storage =multer.diskStorage({
    destination:(req,productImage,cb)=>{
        // const user_id=req.session.userId;
        // const userFolder=path.join('public/UserImages',user_id);
        // fs.mkdirSync(userFolder, { recursive: true });
        cb(null,'public/UserImages')
    },
    filename:(req,productImage,cb)=>{
        cb(null,productImage.fieldname + "_" + Date.now() + path.extname(productImage.originalname))
    }
})
const upload = multer({
    storage:storage
})
const port=3000;
const saltRound=10;
//Database connection
const dbURL1='mongodb://localhost:27017/userDetails';
const dbURL2='mongodb://localhost:27017/OrderBookingDetails';
//DataBase UserDetails connection
const db1connection=mongoose.createConnection(dbURL1);
db1connection.on('connected', () => {
    console.log('Connected to UserDetailsDataBase!.');
});
db1connection.on('error',()=>{
    console.error('Error connecting to UserDetailsDataBase!.', err);
});


//DataBase OrderBooking connection
const db2connection=mongoose.createConnection(dbURL2);
db2connection.on('connected', () => {
    console.log('Connected to OrderBookingDataBase!.');
});
db2connection.on('error', (err) => {
    console.error('Error connecting to OrderBookingDataBase!.', err);
});


//DataBase UserDetails Schema creation
const userRegisterSchema=new mongoose.Schema({
    username:String,
    email:{
        type:String,
        required:true,
        unique:true
    },
    phonenumber:Number,
    password:String,
    userId:{
        type:String,
        required:true,
        unique:true
    },
    Role:String,
})
const driverRegisteredSchema=new mongoose.Schema({
    Firstname:String,
    Lastname:String,
    Email:String,
    PhoneNumber:Number,
    AadharNumber:Number,
    VehicleNumber:String,
    DrivingLicenseNumber:String,
    PreferedLocations:String
})
const userRegisterData =db1connection.model('userData',userRegisterSchema);
const DriverRegisterData=db1connection.model('DriverUsersData',driverRegisteredSchema);
//DataBase OrderBooking Schema creation
const OrderDetailsSchema=new mongoose.Schema({
    OrderId:String,
    UserId:String,
    SenderName:String,
    FromCity:String,
    SenderPhoneNo:Number,
    ItemWeight:Number,
    SenderAddress:String,
    ReceiverName:String,
    ToCity:String,
    ReceiverPhoneNo:Number,
    ReceiverAddress:String,
    DateOfOrder:{
        type:String,
    },
    Status:{
        type:String,
        default:'Pending'
    },
    DeliverBy:{
        type:String,
        default:'None'
    },
    ProductImage_Name:{
        type:String,
        unique:true
    },
    ProductImage_Path:String
});
const OrderDetails=db2connection.model('OrderDetails',OrderDetailsSchema);

//function for authentication
const authenticates=(req,res,next)=>{
    if(req.session.userId)
    {
        next()
    }
    else{
        res.redirect('/login');
    } 
}
const authenticatesSignup=(req,res,next)=>{
    if(!req.session.userId)
    {
        next()
    }
    else{
        res.redirect('/login');
    } 
}
//GET UNIQUE ORDER ID 
function generateOrderId()
{
    const oid=uuid.v4().replace('/-/g','');
    return oid.substring(0,8);
}

//ALL GET ROUTES FOR STATIC WEBPAGES RENDERING OF WEBSITE
app.get('/',(req,res)=>{
    res.sendFile(__dirname+'/public/HTML/Mainprj.html');
});

app.get('/login',(req,res)=>{
    res.sendFile(__dirname+'/public/HTML/loginforprj1.html');
});

app.get('/signup',authenticatesSignup,(req,res)=>{
    res.sendFile(__dirname+'/public/HTML/Register.html');
});
app.get('/about',(req,res)=>{
    res.sendFile(__dirname+'/public/HTML/aboutforprj.html');
});
app.get('/issues',(req,res)=>{
    res.sendFile(__dirname+'/public/HTML/Anyissues.html');
});
app.get('/customerMainPage',authenticates,(req,res)=>{
    res.sendFile(__dirname+'/public/HTML/customermain.html');
});
app.get('/booking',authenticates,(req,res)=>{
    res.sendFile(__dirname+'/public/HTML/bookingpage.html');
});
app.get('/Driversignup',(req,res)=>{
    res.sendFile(__dirname+'/public/HTML/DriverRegistration.html');
});
app.get('/forgotPassword',(req,res)=>{
    res.sendFile(__dirname+'/public/HTML/forgotPassWord.html');
});
app.get('/drivermainpage',(req,res)=>{
    res.sendFile(__dirname+'/public/HTML/DriverMain.html');
})
app.post('/register',async(req,res)=>{
    try{
        const userName=req.body.email.toLowerCase();
        const foundUser=await userRegisterData.findOne({email:userName});
        const foundDriver=await DriverRegisterData.findOne({Email:userName});
        if(foundUser)
        {
            return res.status(400).json({msg:"UE"});
        }
        else if(foundDriver)
        {
            const hashpass=await bcrypt.hash(req.body.password,saltRound);
            const formData=new userRegisterData({
                username:req.body.username,
                email:userName,
                phonenumber:req.body.phno,
                password:hashpass,
                userId:`PIU-U@${uuid.v4()}`,
                Role:`driver`,
            });
            await formData.save();
            res.status(200).json({msg:"TRUE"});
        }
        else
        {
            const hashpass=await bcrypt.hash(req.body.password,saltRound);
            const formData=new userRegisterData({
                username:req.body.username,
                email:userName,
                phonenumber:req.body.phno,
                password:hashpass,
                userId:`PIU-U@${uuid.v4()}`,
                Role:`client`,
            });
            await formData.save();
            res.status(200).json({ msg: "TRUE" });
        }
        
    }
    catch(err){
        res.status(400).json({message:err.message});

    }
});
app.post('/login',async(req,res)=>{
    try{
        const userName=req.body.username;
        const password=req.body.password;
        const foundUser=await userRegisterData.findOne({email:userName});
        if(foundUser)
        {
            bcrypt.compare(password,foundUser.password, function (err, result) {
                    if (result === true) {
                        req.session.userId=foundUser.userId;
                        req.session.UserName=foundUser.username;
                        if(foundUser.Role === 'client')
                        {
                            res.redirect('/customerMainPage');   
                        }
                        else{
                            res.redirect('/');
                        }
                    }
                    else{
                        res.send("<h1>Invalid credentials</h1>");
                    }
            });
        }
        else{
            res.send('<h1>User Not Found1!...</h1>')
        }
        
    }
    catch(err){
        res.status(400).json({message:err.message});
    }
});
app.post('/changePassword',async(req,res)=>{
    try{
        const userName=req.body.email.toLowerCase();
        const foundUser=await userRegisterData.findOne({email:userName});
        if(foundUser)
        {
            const hashpass=await bcrypt.hash(req.body.password,saltRound);
            await userRegisterData.updateOne({password:hashpass});
            return res.status(200).json({message:"Sucessfully Pasword Changed!."});   
        }
        else{
            return res.status(400).json({message:"User With This Email Not Found!."});
        }
        
    }
    catch(err){
        res.status(400).json({message:err.message});
    }
});

app.post('/driverRegisterData',async(req,res)=>{
    const email = req.body.email;
    const aadharno = req.body.aadharnumber;
    const vehicleno = req.body.vehicleno;
    const drvlicenseno = req.body.Drivinglicenseno;
    
    try {
        const emailExists = await DriverRegisterData.findOne({ Email: email });    
        if (emailExists) {
            return res.status(400).json({ msg: "EAE" });
        }
        const aadharExists = await DriverRegisterData.findOne({ AadharNumber: aadharno });
        if (aadharExists) {
            return res.status(400).json({ msg: "AAE" });
        }
        const vehicleExists = await DriverRegisterData.findOne({ VehicleNumber: vehicleno });
        if (vehicleExists) {
            return res.status(400).json({ msg: "VAE" });
        }
        const licenseExists = await DriverRegisterData.findOne({ DrivingLicenseNumber: drvlicenseno });
        if (licenseExists) {
            return res.status(400).json({ msg: "DAE" });
        }
    
        const driverData = new DriverRegisterData({
            Firstname: req.body.firstname,
            Lastname: req.body.lastname,
            Email: email,
            PhoneNumber: req.body.mobileno,
            AadharNumber: aadharno,
            VehicleNumber: vehicleno,
            DrivingLicenseNumber: drvlicenseno,
            PreferedLocations: req.body.Preferredlocations
        });
    
        await driverData.save();
        res.status(200).json({ msg: "Driver Registration Succesful!." });
        // res.redirect('/signup');
    } catch (error) {
        console.error("Error registering driver:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
    
});
app.post('/bookingData',authenticates,upload.single('productImage'),async(req,res)=>{
    const OrderData=new OrderDetails({
        OrderId:generateOrderId(),
        UserId:req.session.userId,
        SenderName:req.body.sendername,
        FromCity:req.body.fromCity,
        SenderPhoneNo:req.body.phoneno,
        ItemWeight:req.body.weight,
        DateOfOrder:new Date().toISOString(),
        SenderAddress:req.body.senderAddress,
        ReceiverName:req.body.receivername,
        ToCity:req.body.toCity,
        ReceiverPhoneNo:req.body.receiverPhoneNo,
        ReceiverAddress:req.body.receiverAddress,
        Status:req.body.status,
        ProductImage_Name:req.file.filename,
        ProductImage_Path:req.file.path,
    })
    await OrderData.save();
    res.status(200);
    res.redirect('/customerMainPage');
});
app.get('/getusername',authenticates,(req,res)=>{
    res.status(200).json({username:req.session.UserName});
});
app.get('/logout',authenticates,(req,res)=>{
    if(req.session)
    {
        req.session.destroy((err)=>{
            if(err)
            {res.status(500).send('ERROR WHILE DESTROYING SESSION');}
            else{
                res.redirect("/");
            }
        });
    }
});

app.get('/customerOrderDetails/:status',authenticates, async (req,res)=>{
    const query={UserId:req.session.userId,Status:req.params.status};
    const statusSpecificOrderDetails = await OrderDetails.find(query).sort({DateOfOrder: -1 });
    res.send(statusSpecificOrderDetails);
});
app.get('/customerOrderDetails',authenticates, async (req,res)=>{
    const query={UserId:req.session.userId};
    const userOrderDetails = await OrderDetails.find(query).sort({ DateOfOrder: -1 });
    res.send(userOrderDetails);
});
app.get('/getorderdetails/:orderId',authenticates, async (req,res)=>{
    const query={OrderId:req.params.orderId};
    const singleOrderDetails = await OrderDetails.find(query);
    res.send(singleOrderDetails);
});
app.listen(port,()=>{
    console.log(`Server running on port ${port}`);
});
