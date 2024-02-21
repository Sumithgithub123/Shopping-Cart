var db=require('../config/connection')
var collection=require('../config/collections')
const bcrypt = require('bcrypt')
const { response } = require('express')
const collections = require('../config/collections')
const { reject } = require('bcrypt/promises')
const async = require('hbs/lib/async')
var objectId = require('mongodb').ObjectId
const Razorpay = require('razorpay')
const { resolve } = require('path')
var instance = new Razorpay({ key_id:'rzp_test_cwXAIrBX4Eaj6B', key_secret:'akDrAxP6QjbdYF1vn6XXXu6x'})

module.exports={
    doSignup:(userData)=>{
        return new Promise(async(resolve,reject)=>{
         let exist = await db.get().collection(collection.USER_COLLECTION).findOne({Email:userData.Email})
            if(exist){
                resolve({status:true})
            }else{
            userData.password =await bcrypt.hash(userData.password,10)
           await db.get().collection(collection.USER_COLLECTION).insertOne(userData)
            resolve(userData)
            }
        })
    },
    doLogin:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            let loginStatus = false
            let response={}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({Email:userData.email})
            if(user){
                bcrypt.compare(userData.password,user.password).then((status)=>{
                    if (status) {
                        console.log('login success')
                        response.user=user
                        response.status=true
                        resolve(response)
                    }else{
                        console.log('login failed')
                        resolve({status:false})
                    }
                })
            }else{
                console.log('Email not match')
                resolve({status:false})
            }
        })
    },
    addtoCart:(prodId,userId)=>{
        let proObj={
            item:new objectId(prodId),
            quantity:1
        }
       return new Promise(async(resolve,reject)=>{
        let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({user:new objectId(userId)})
     if(userCart){
        let proExit=userCart.product.findIndex(product=>product.item==prodId)
        //console.log(proExit)
        if(proExit!=-1){
           db.get().collection(collection.CART_COLLECTION).updateOne({user:new objectId(userId),'product.item':new objectId(prodId)},{
            $inc:{'product.$.quantity':1}
           }).then(()=>{
            resolve()
           })
        }else{
            db.get().collection(collection.CART_COLLECTION).updateOne({user:new objectId(userId)},
        {$push:{product:proObj}}).then((response)=>{
            resolve(response)
        })
        }
    }else{
        let cartObj={
            user:new objectId(userId),
            product:[proObj]
        }
        db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{
            resolve(response)
        })
    }
       })
    },
    getCartproducts:(userId)=>{
       return new Promise(async(resolve,reject)=>{
        let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
            {
                $match:{user:new objectId(userId)}
            },
            {
                $unwind:'$product'
            },
            {
                $project:{
                item:'$product.item',
                quantity:'$product.quantity'
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
            // {
            //     $lookup:{
            //         from:collection.PRODUCT_COLLECTION,
            //         let:{prolist:'$product'},
            //         pipeline:[
            //             {
            //             $match:{
            //                 $expr:{
            //                     $in:['$_id',"$$prolist"]
            //                 }
            //             }
            //             }
            //         ],
            //         as:'cartItems'
            //     }
            // }
        ]).toArray()
        // console.log(cartItems[0].products)
        resolve(cartItems)
        // resolve(cartItems[0].cartItems)
       })
    },
    getcartCount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            cartlength = 0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({user:new objectId(userId)})
            if(cart){
                for(let i=0;i<cart.product.length;i++){
                    cartlength += cart.product[i].quantity
                }
            }
            resolve(cartlength)
        })
    },
    changeProductQuantity:(details)=>{
        count = parseInt(details.count)
        quantity = parseInt(details.quantity)
        //console.log(count)
        return new Promise((resolve, reject) => {
            if(details.count==-1 && details.quantity==1){
                db.get().collection(collection.CART_COLLECTION).updateOne({_id:new objectId(details.cart)},{
                    $pull:{product:{item:new objectId(details.product)}}
                }).then((response)=>{
                  resolve({removeProduct:true})
                })
            }else{
                db.get().collection(collection.CART_COLLECTION).updateOne({_id:new objectId(details.cart),'product.item':new objectId(details.product)},{
                    $inc:{'product.$.quantity':count}
                   }).then((response)=>{
                    resolve({status:true})
                   })
            }
        })
    },
    deleteProduct:(information)=>{
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).updateOne({_id:new objectId(information.car)},{
                $pull:{product:{item:new objectId(information.pro)}}
            }).then((response)=>{
              resolve(response)
            })
        })
    },
    getTotalamount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:new objectId(userId)}
                },
                {
                    $unwind:'$product'
                },
                {
                    $project:{
                    item:'$product.item',
                    quantity:'$product.quantity'
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
                    },
                },
                {
                    $group:{
                        _id:null,
                        total:{$sum:{$multiply:['$quantity','$product.Price']}}
                    }
                }
            ]).toArray()
            console.log(total[0].total)
            resolve(total[0].total)
           })
    },
    placeOrder:(order,products,total)=>{
         return new Promise((resolve,reject)=>{
           let status = order['payment-method']=='COD'? 'placed' :'pending'
           let paymentstatus = true
           let info = 'Cash on Delivery'
           let ordercancel = false
           let delivered = false
           if(status=='pending'){
               paymentstatus = false
               info = 'Not Payed'
           }
           let orderObj ={
            deliveryDetails:{
                mobile:order.Mobile,
                address:order.Address,
                pincode:order.Pincode,
                date:new Date()
            },
            userId:new objectId(order.userId),
            paymentMethod:order['payment-method'],
            products:products,
            status:status,
            totalPrice:total,
            paymentstatus:paymentstatus,
            info:info,
            ordercancel:ordercancel,
            delivered:delivered
           }
           db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
            db.get().collection(collection.CART_COLLECTION).deleteOne({user:orderObj.userId})
             resolve(response.insertedId)
           })

         })
    },
    getCartProductList:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({user:new objectId(userId)})
            if(cart){
                resolve(cart.product)
            }else{
                resolve({status:true})
            }
        })
    },
    getOrderproducts:(userId)=>{
        return new Promise(async(resolve,reject)=>{
        let orderdetail =await db.get().collection(collection.ORDER_COLLECTION).find({userId:new objectId(userId)}).toArray()
            resolve(orderdetail)
        })
    },
    getOrderedproducts:(orderId)=>{
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
    },
    generateRazorpay:(orderId,total)=>{
        return new Promise((resolve,reject)=>{
            var options = {
                 amount:total*100,
                 currency: "INR",
                 receipt: orderId,
            }
            instance.orders.create(options, function(err,order){
                if(err){
                    console.log(err)
                }else{
                console.log("New order:",order)
                resolve(order)
                }
            })
        })
    },
    verifyPayment:(details)=>{
          return new Promise((resolve,reject)=>{
            const crypto = require("crypto")
            let hmac = crypto.createHmac('sha256', 'akDrAxP6QjbdYF1vn6XXXu6x')
            hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]'])
            hmac=hmac.digest('hex')
            if(hmac==details['payment[razorpay_signature]']){
                resolve()
            }else{
                reject()
            }
          })
    },
    changepaymentStatus:(orderId)=>{
       return new Promise((resolve,reject)=>{
        let response = db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:new objectId(orderId)},{
            $set:{
                status:'placed',
                paymentstatus:true,
                info:'Completed'
            }
        }).then(()=>{
            resolve()
        })
       })
    },
    gettotalprice:(orderId)=>{
       return new Promise(async(resolve,reject)=>{
        let order =await db.get().collection(collection.ORDER_COLLECTION).findOne({_id:new objectId(orderId)})
            resolve(order.totalPrice)
       })
    },
    cancelorder:(orderId)=>{
        return new Promise(async(resolve,reject)=>{
         let detail =await db.get().collection(collection.ORDER_COLLECTION).findOne({_id:new objectId(orderId)})
         console.log(detail)
         if(detail.paymentMethod=='COD'){
           await db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:new objectId(orderId)},
            {
                $set:{
                    status:'Canceled',
                    ordercancel:true,
                    info:'No Refund needed'
                }
            }
            ).then((response)=>{
                resolve({status:true})
            })
         }else{
            if(detail.status=='pending'){
                await db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:new objectId(orderId)},
            {
                $set:{
                    status:'Canceled',
                    ordercancel:true,
                    info:'No Refund needed',
                    paymentstatus:true
                }
            }
            ).then((response)=>{
                resolve({status:true})
            })
            }else{
                await db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:new objectId(orderId)},
            {
                $set:{
                    status:'Canceled',
                    ordercancel:true,
                    info:'Refunded'
                }
            }
            ).then((response)=>{
                resolve({status:true})
            })
            }
           
         }
        })
    },
    changeProfile:(data)=>{
        return new Promise(async(resolve,reject)=>{
            if(!data.email){
           await db.get().collection(collection.USER_COLLECTION).updateOne({_id:new objectId(data.userId)},
            {
                $set:{
                    Name:data.name,
                }
            }).then(()=>{
                resolve({status:true})
            })
        }else if(!data.name){
           await db.get().collection(collection.USER_COLLECTION).updateOne({_id:new objectId(data.userId)},
            {
                $set:{
                    Email:data.email,
                }
            }).then(()=>{
                resolve({status:true})
            })
        }else{
           await db.get().collection(collection.USER_COLLECTION).updateOne({_id:new objectId(data.userId)},
            {
                $set:{
                    Name:data.name,
                    Email:data.email
                }
            }).then(()=>{
                resolve({status:true})
            })
        }
        })
    },
    getUser:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let userdetail =await db.get().collection(collection.USER_COLLECTION).findOne({_id:new objectId(userId)})
            resolve(userdetail)
        })
    }
    
}