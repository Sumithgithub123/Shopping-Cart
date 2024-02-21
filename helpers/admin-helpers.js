var db = require('../config/connection')
var collection = require('../config/collections')
var objectId = require('mongodb').ObjectId
const bcrypt = require('bcrypt')
const { response } = require('express')
const async = require('hbs/lib/async')
module.exports = {

    getdelivery: () => {
        return new Promise(async (resolve, reject) => {
            let neworders = []
            let orders = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $lookup: {
                        from: collection.USER_COLLECTION,
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'userdetail'
                    }
                },
                {
                    $project: {
                        deliveryDetails: 1,
                        status: 1,
                        userdetail: { $arrayElemAt: ['$userdetail', 0] }
                    }
                }
            ]).toArray()
            //   for(let i=0;i<orders.length;i++){
            //     if(orders[i].status!='pending' && orders[i].status!='Delivered'){
            //         neworders[i] = orders[i]
            //     }
            //   }
            neworders = orders.filter(check)

            function check(orders) {
                return orders.status != 'pending' && orders.status != 'Delivered' && orders.status != 'Canceled'
            }
            //console.log(neworders)
            resolve(neworders)
        })
    },
    doSignup: (superData) => {
        return new Promise(async (resolve, reject) => {
            superData.password = await bcrypt.hash(superData.password, 10)
            db.get().collection(collection.SUPER_COLLECTION).insertOne(superData)
            resolve(superData)
        })
    },
    doLogin: (superData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let superdetail = await db.get().collection(collection.SUPER_COLLECTION).findOne({ Email: superData.email })
            if (superdetail) {
                bcrypt.compare(superData.password, superdetail.password).then((status) => {
                    if (status) {
                        console.log('super login success')
                        response.super = superdetail
                        response.status = true
                        resolve(response)
                    } else {
                        console.log('super login failed')
                        resolve({ status: false })
                    }
                })
            } else {
                console.log('super Email not match')
                resolve({ status: false })
            }
        })
    },
    changedeliverystatus: (orderId, value) => {
        return new Promise(async (resolve, reject) => {
            if (value == 'Delivered') {
                await db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: new objectId(orderId) },
                    {
                        $set: {
                            status: value,
                            info: 'Completed',
                            ordercancel: true,
                            delivered: true
                        }
                    }).then((response) => {
                        resolve({ status: true })
                    })
            } else {
                let orderdetail = await db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: new objectId(orderId) })
                if (orderdetail.paymentMethod == 'COD') {
                    await db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: new objectId(orderId) },
                        {
                            $set: {
                                status: value,
                                info: 'Cash on Delivery'
                            }
                        }).then((response) => {
                            resolve({ status: true })
                        })
                } else {
                    await db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: new objectId(orderId) },
                        {
                            $set: {
                                status: value
                            }
                        }).then((response) => {
                            resolve({ status: true })
                        })
                }
            }
        })
    },
    alladmin: () => {
        return new Promise(async (resolve, reject) => {
            let alladmin = await db.get().collection(collection.ADMIN_COLLECTION).find().toArray()
            resolve(alladmin)
        })
    },
    alluser:()=>{
        return new Promise(async(resolve,reject)=>{
            let alluser = await db.get().collection(collection.USER_COLLECTION).find().toArray()
            resolve(alluser)
        })
    },
    allorders:()=>{
        return new Promise(async(resolve,reject)=>{
            let allorders = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $lookup:{
                        from: collection.USER_COLLECTION,
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'userdetail'
                    }
                },
                {
                    $project:{
                        deliveryDetails:'$deliveryDetails',
                        userdetail:{$arrayElemAt:['$userdetail',0]},
                        status:'$status',
                        info:'$info',
                        total:'$totalPrice',
                        paymentMethod:'$paymentMethod'
                    }
                },{
                    $project:{
                        deliveryDetails:1,
                        userdetail:1,
                        status:1,
                        info:1,
                        total:1,
                        paymentMethod:1
                    }
                }
            ]).toArray()
            resolve(allorders)
        })
    },
    getorderedproduct:(orderId)=>{
            return new Promise(async(resolve,reject)=>{
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
                    }
                ]).toArray()
                console.log(orderedItems)
                resolve(orderedItems)
            })
        }
        

}