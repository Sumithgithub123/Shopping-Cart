var db=require('../config/connection')
var collection=require('../config/collections')
var objectId = require('mongodb').ObjectId
const bcrypt = require('bcrypt')
const async = require('hbs/lib/async')
module.exports={

    addProduct:function(product,callback){               //using callback
           product.adminId = new objectId(product.adminId)
           product.Price = parseInt(product.Price)
        db.get().collection('product').insertOne(product).then(function(data){
            // console.log(data.insertedId)
           callback(data.insertedId)
        })
    },
    getAllProducts:()=>{                                //using promise
        return new Promise(async(resolve,reject)=>{
            let products =await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },
    deleteProduct:(prodId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({_id:new objectId(prodId)}).then((response)=>{
                console.log(response)
                resolve(response)
            })
        })
    },
    getproductDetails:(proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:new objectId(proId)}).then((product)=>{
                resolve(product)
            })
        })
    },
    updateproduct:(proId,prodetails)=>{
        return new Promise((resolve,reject)=>{
              db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:new objectId(proId)},{$set:{
                name:prodetails.name,Description:prodetails.Description,Price:parseInt(prodetails.Price),Category:prodetails.Category
            }}).then((response)=>{
                resolve(response)
            })
        })
    },
    doSignup:(adminData)=>{
        return new Promise(async(resolve,reject)=>{
            let exist = await db.get().collection(collection.ADMIN_COLLECTION).findOne({Email:adminData.Email})
            if(exist){
                resolve({status:true})
            }else{
            adminData.password =await bcrypt.hash(adminData.password,10)
            db.get().collection(collection.ADMIN_COLLECTION).insertOne(adminData)
            resolve(adminData)
            }
        })
    },
    doLogin:(adminData)=>{
        return new Promise(async(resolve,reject)=>{
            let loginStatus = false
            let response={}
            let admindetail = await db.get().collection(collection.ADMIN_COLLECTION).findOne({Email:adminData.email})
            if(admindetail){
                bcrypt.compare(adminData.password,admindetail.password).then((status)=>{
                    if (status) {
                        console.log('admin login success')
                        response.admin=admindetail
                        response.status=true
                        resolve(response)
                    }else{
                        console.log('admin login failed')
                        resolve({status:false})
                    }
                })
            }else{
                console.log('admin Email not match')
                resolve({status:false})
            }
        })
    },
    getAdminproducts:(adminId)=>{
        return new Promise(async(resolve,reject)=>{
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find({adminId:new objectId(adminId)}).toArray()
            resolve(products)
        })
        
    },
    getadminorders:(adminId)=>{
        return new Promise(async(resolve,reject)=>{
            let neworders = []
            let orders = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                    item:'$products.item',
                    quantity:'$products.quantity',
                    info:'$info',
                    total:'$totalPrice',
                    userId:'$userId',
                    status:'$status',
                    deliveryDetails:'$deliveryDetails'
                }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $lookup:{
                        from:collection.USER_COLLECTION,
                        localField:'userId',
                        foreignField:'_id',
                        as:'userdetail'
                    }
                },
                {
                    $project:{
                        item:1,
                        quantity:1,
                        info:1,
                        status:1,
                        total:1,
                        deliveryDetails:1,
                        userdetail:{$arrayElemAt:['$userdetail',0]},
                        product:{$arrayElemAt:['$product',0]}
                    }
                }
            ]).toArray()
             neworders = orders.filter(check)
            function check(orders){
                return orders.product.adminId == adminId
            }
            resolve(neworders)
        })
    },
    getadminorderedpro:(orderId,prodId,adminId)=>{
        return new Promise(async(resolve,reject)=>{
            let newordered;
            let orderedItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{_id:new objectId(orderId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                    item:'$products.item',
                    quantity:'$products.quantity'
                }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,
                        quantity:1,
                        product:{$arrayElemAt:['$product',0]}
                    }
                },
            ]).toArray()
            // console.log(orderedItems)
             newordered = orderedItems.filter(check)
             function check(orderedItems){
                return orderedItems.product.adminId == adminId
             }
           var newhi = newordered.filter(check1)
           function check1(newordered){
                return newordered.product._id == prodId
            }
            console.log(newhi)
            resolve(newhi)
        })
    },
    getadmin:(adminId)=>{
        return new Promise(async(resolve,reject)=>{
          let admindetail = await db.get().collection(collection.ADMIN_COLLECTION).findOne({_id:new objectId(adminId)})
          resolve(admindetail)
        })
    },
    changeProfile:(admindata)=>{
        return new Promise(async(resolve,reject)=>{
            if(!admindata.email){
                await db.get().collection(collection.ADMIN_COLLECTION).updateOne({_id:new objectId(admindata.adminId)},
                 {
                     $set:{
                         Name:admindata.name,
                     }
                 }).then(()=>{
                     resolve({status:true})
                 })
             }else if(!admindata.name){
                await db.get().collection(collection.ADMIN_COLLECTION).updateOne({_id:new objectId(admindata.adminId)},
                 {
                     $set:{
                         Email:admindata.email,
                     }
                 }).then(()=>{
                     resolve({status:true})
                 })
             }else{
                await db.get().collection(collection.ADMIN_COLLECTION).updateOne({_id:new objectId(admindata.adminId)},
                 {
                     $set:{
                         Name:admindata.name,
                         Email:admindata.email
                     }
                 }).then(()=>{
                     resolve({status:true})
                 })
             }
        })
    }


    // getadminorderedpro:(orderId,adminId)=>{
    //     return new Promise(async(resolve,reject)=>{
    //         let newordered;
    //         let orderedItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
    //             {
    //                 $match:{_id:new objectId(orderId)}
    //             },
    //             {
    //                 $unwind:'$products'
    //             },
    //             {
    //                 $project:{
    //                 item:'$products.item',
    //                 quantity:'$products.quantity'
    //             }
    //             },
    //             {
    //                 $lookup:{
    //                     from:collection.PRODUCT_COLLECTION,
    //                     localField:'item',
    //                     foreignField:'_id',
    //                     as:'product'
    //                 }
    //             },
    //             {
    //                 $project:{
    //                     item:1,
    //                     quantity:1,
    //                     product:{$arrayElemAt:['$product',0]}
    //                 }
    //             }
    //         ]).toArray()
    //         console.log(orderedItems)
    //          newordered = orderedItems.filter(check)
    //          function check(orderedItems){
    //             return orderedItems.product.adminId == adminId
    //          }
    //         console.log(newordered)
    //         resolve(newordered)
    //     })
    // }
    
}