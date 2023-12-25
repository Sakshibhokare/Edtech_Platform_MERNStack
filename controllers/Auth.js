
const User= require("../models/User");
const OTP = require("../models/OTP");
const otpGenerator = require("otp-generator");
const { response } = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// send otp 
exports.sendOTP = async (req, res)=> {
    try{ 
     //fetch email from request ki body
     const {email}= req.body;

     //check if user already exist 
     const checkUserPresent = await User.findOne({email});

     //if user already exist , then return response
     if(checkUserPresent){
        return res.status(401).json({
            sucess: false,
            message:'User already registered',
        })
      }
      //generate otp
      var otp = otpGenerator.generate(6,{
        upperCaseAlphabets:false,
        lowerCaseAlphabets:false,
        specialChars:false
      });
      console.log("OTP generated: ", otp);

      //check unique otp or not
      const result= await OTP.findOne({otp:otp});

      while(result){
        otp=otpGenerator(6,{
            upperCaseAlphabets:false,
            lowerCaseAlphabets:false,
            specialChars:false,
        });
        result=await OTP.findOne({otp:otp});
      }

      const otpPayload = {email, otp};

    //   create an entry for otp
    const otpBody=await OTP.create(otpPayload);
    console.log(otpBody);

    // return response sucessful 
    res.status(200).json({
        sucess:true,
        message:'OTP Sent Sucessfully',
        otp,
    })
 }
    catch(error){
        console.log(error);
        return res.status(500).json({
            sucess:true,
            message:error.message
        })

    }

};




// singup
exports.signUp = async(req, res) => {
    try{

    // data fetch from request ki body 
    const {
        firstName,
        lastName,
        email,
        password,
        confirmPassword,
        accountType,
        contactNumber,
        otp 
    }=req.body;

    // validate  
    if(!firstName || !lastName || !email || !password || !confirmPassword
        || !otp){
            return res.status(403).json({
                sucess:false,
                message:"All fields are required",
            })
        }


    // 2 password match
    if(password!==confirmPassword){
        return res.status(400).json({
            sucess:false,
            message:'Password and ConfirmPassword Value does not match, please try again later',
        });
    } 

    // check user alredy exist or not 
    const existingUser = await User.findOne({email});
    if(existingUser){
        return res.status(400).json({
            sucess:false,
            message:'User is already registered',
        });
    }

    // find most recent otp stored for the user 
    const recentOtp=await OTP.find({email}).sort({createdAt: -1}).limit(1);
    console.log(recentOtp);

    // validate otp 
    if(recentOtp.length ==0){
        // OTP Not found 
        return res.status(400).json({
            sucess:false,
            message:'OTP Not Found',
        })
    } else if(otp!==recentOtp.otp){
        // invalid otp 
        return res.status(400).json({
            sucess:false,
            message:"Invalid OTP",
        });
    }





    // Hash password 
    const hashedPassword = await bcrypt.hash(password, 10);

    // entry create in DB

    const profileDetails = await Profile.create({
        gender:null,
        dateOfBirth:null,
        about:null,
        contactNumber:null,
    });

    const user = await User.create({
        firstName,
        lastName,
        email,
        contactNumber,
        password:hashedPassword,
        accountType,
        additionalDetails:profileDetails._id,
        image:`https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastname}`,
    })

    // return response
       return res.status(200).json({
        sucess:true,
        message:'User is registered Sucessfully',
        user,
       });
    }
    catch(error){
       console.log(error);
       return res.status(500).json({
        sucess:false,
        message:"User cannot be registered. please try again",
       })
    }
    
}




// login
exports.login = async(req, res)=>{
    try{
        //get data from req body
        const {email, password}=req.body;

        //validation data
        if(!email || !password){
            return res.status(403).json({
                sucess:false,
                message:'All fields are required, please try again'
            });
        }

        //user check exist or not 
         const user = await User.findOne({email}).populate("additionalDetails");
         if(!user){
            return res.status(401).json({
                sucess:false,
                message:"User is not registrered, please signup first",
            });
         }

        //generate JWt, after password matching
           if(await bcrypt.compare(password, user.password)){
            const payload={
                email: user.email,
                id: user._id,
                role: user.role,
            }
            const token = jwt.sign(payload, process.env.JWT_SECRET, {
                expiresIn:"2h",

            });
            user.token = token;
            user.password= undefined;
           

        //create cookie and send response
        const options={
            expires:new Date(Date.now() + 3*24*60*60*1000),
            httpOnly:true,
        }
          res.cookie("token", token, options).status(200).json({
            sucess:true,
            token,
            user,
            message:'Logged in sucessfully',
          })
        }
        else{
            return res.status(401).json({
                sucess:false,
                message:'Password is incorrect',
            });
        }

    }
    
    catch(error){
        console.log(error);
        return res.status(500).json({
            sucess:false,
            message:'Login Failure, please try again'
        });
    }
};



// change password 