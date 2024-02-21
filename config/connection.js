const {MongoClient} = require('mongodb')
const state = {
    db:null
}

const url = 'mongodb://127.0.0.1:27017'
const client = new MongoClient(url)


const dbName = 'shopping'

module.exports.connect=async function(done){
    await client.connect()
    state.db = client.db(dbName)

    return new Promise((resolve,reject)=>{
        if(!this.connect)
        {
            reject('Connection Failed')
        }
        resolve('Database Connected Successfully')
    })
}

module.exports.get=function(){
        return state.db
     }















// const mongoClient = require('mongodb').MongoClient
// const state={
//     db:null
// }

// module.exports.connect=function(done){
//     const url='mongodb://127.0.0.1:27017'
//     const dbname ='shopping'

//     mongoClient.connect(url,function(err,data){
//         if(err) return done(err)
//         state.db=data.db(dbname)
//         done()
//     })
// }

// module.exports.get=function(){
//     return state.db
// }