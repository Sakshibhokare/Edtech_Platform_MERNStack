
const User= require("../models/User");
const OTP = require("../models/OTP");
const otpGenerator = require("otp-generator");
const { response } = require("express");

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

    // return res 
}




// login




// change password 