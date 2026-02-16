const mongoose = require("mongoose");
const dbconnect = async()=>{
    try{
            await mongoose.connect("mongodb+srv://ariz:kinged20@cluster0.nnzafvq.mongodb.net/transactions?appName=Cluster0");
            console.log("database connection successfull");
        }catch(error){
            console.log(error);
            process.exit(0);
        }
}

module.exports = dbconnect;