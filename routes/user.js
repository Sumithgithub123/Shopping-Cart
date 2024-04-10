var express = require('express');
var router = express.Router();
var productHelper = require('../helpers/product-helpers')
var userHelper = require('../helpers/user-helpers');
const userHelpers = require('../helpers/user-helpers');

const verifyLogin = (req,res,next)=>{
  if(req.session.userloggedIn){
  next()
}else{
  res.redirect('/login')
}
}

/* GET home page. */
router.get('/',async function(req, res, next) {
  let user = req.session.user
  // console.log(user)
  cartCount = null
  if(user)
  {
      await userHelper.getcartCount(req.session.user._id).then((cartlength)=>{
      cartCount = cartlength
    })
  }
  productHelper.getAllProducts().then((products)=>{
    res.render('user/view-products', { products,user,admin:false,cartCount});
  })
});

router.get('/login',function(req,res){
  if(req.session.user){
    res.redirect('/')
  }else{
    res.render('user/login',{logginErr:req.session.userlogginErr})
    req.session.userlogginErr = false
  }
})

router.get('/signup',function(req,res){
  res.render('user/signup',{signupErr:req.session.usersignupErr})
  req.session.usersignupErr = false
})

router.post('/signup',(req,res)=>{
  userHelper.doSignup(req.body).then((response)=>{
      //  console.log(response)
      if(response.status){
        req.session.usersignupErr = true
        res.redirect('/signup')
      }else{
      req.session.user = response
      req.session.userloggedIn = true
      res.redirect('/')
      }
  })
})

router.post('/login',(req,res)=>{
  userHelper.doLogin(req.body).then((response)=>{
    if(response.status){
      req.session.user = response.user
      req.session.userloggedIn = true
      res.redirect('/')
    }else{
      req.session.userlogginErr = true
      res.redirect('/login')
    }
  })
})

router.get('/logout',(req,res)=>{
  req.session.user = null
  req.session.userloggedIn = null
  res.redirect('/')
})

router.get('/cart',verifyLogin,async(req,res)=>{
  let products =await userHelpers.getCartproducts(req.session.user._id)
  let totals = null
  if(products.length>0){
    totals = await userHelpers.getTotalamount(req.session.user._id)
  }
  res.render('user/cart',{products,user:req.session.user,totals})
  //console.log(products)
})

router.get('/add-to-cart/:id',(req,res)=>{
  //console.log("api call");
  if(req.session.userloggedIn){
  userHelper.addtoCart(req.params.id,req.session.user._id).then(()=>{
    res.json({status:true})
  })
  }else{
    res.json({notlogin:true})
  }
})

router.post('/change-product-quantity',(req,res,next)=>{
userHelper.changeProductQuantity(req.body).then(async(response)=>{ //here the req.body contains the data from the ajax 'data' field.
  response.total =await userHelpers.getTotalamount(req.body.user)
  res.json(response) //we dont need to sent a html page or some as respone ,here in ajax we give response as a json data.
})
})

router.post('/delete-product',(req,res)=>{
  userHelper.deleteProduct(req.body).then((response)=>{
    res.json(response)
  })
})

router.get('/place-order',verifyLogin,async(req,res)=>{
   let products = await userHelpers.getCartProductList(req.session.user._id)
   let total = null
  if(products.length>0){
    total = await userHelpers.getTotalamount(req.session.user._id)
  }
  res.render('user/place-order',{total,user:req.session.user})
})

router.post('/place-order',async(req,res)=>{
  let products = await userHelpers.getCartProductList(req.body.userId).then(async(products)=>{
    if(products.status){
      res.json({cart:true})
    }else{
      let total = await userHelpers.getTotalamount(req.body.userId)
      userHelpers.placeOrder(req.body,products,total).then((orderId)=>{
        if(req.body['payment-method']=='COD'){
          res.json({codsuccess:true})
        }else{
          userHelpers.generateRazorpay(orderId,total).then((response)=>{
            res.json(response)
          })
        }
      
      })
    }
  })
  console.log(req.body)
})

router.get('/success',(req,res)=>{
  res.render('user/success',{user:req.session.user})
})

router.get('/orders',verifyLogin,async(req,res)=>{
  let orders =await userHelpers.getOrderproducts(req.session.user._id)
  await userHelper.getcartCount(req.session.user._id).then((cartlength)=>{
    cartCount = cartlength
  })
  res.render('user/orders',{user:req.session.user,orders,cartCount})
})

router.get('/view-order-products/:id',verifyLogin,async(req,res)=>{
let products = await userHelpers.getOrderedproducts(req.params.id)
res.render('user/view-order-products',{user:req.session.user,products})
})

router.post('/verifypayment',(req,res)=>{
  console.log(req.body)
  userHelpers.verifyPayment(req.body).then((response)=>{
    userHelpers.changepaymentStatus(req.body['order[receipt]']).then(()=>{
      console.log("successfull")
        res.json({status:true})
    })
  }).catch((err)=>{
    console.log(err)
    res.json({status:false})
  })
})

router.post('/pendingpayment/:id',(req,res)=>{
  let orderId = req.params.id
  let total = userHelpers.gettotalprice(orderId).then((totalprice)=>{
    userHelpers.generateRazorpay(orderId,totalprice).then((response)=>{
      res.json(response)
    })
  })
})

router.get('/cancelorder:id',(req,res)=>{
  userHelpers.cancelorder(req.params.id).then((response)=>{
   res.json(response)
  })
})

router.get('/profile',verifyLogin,(req,res)=>{
  userHelpers.getUser(req.session.user._id).then((detail)=>{
    req.session.user = detail
    res.render('user/profile',{user:req.session.user,profile:true})
  })
})

router.post('/profile',(req,res)=>{
  let id = req.body.userId
  let img = req.files.image
  img.mv('public/images/'+id+'.png',(err)=>{
   if(!err){
    res.redirect('/profile')
   }else{
    console.log(err)
   }
  })
})

router.post('/changeprofile',(req,res)=>{
  let data = req.body
  if(!data.name && !data.email){
    res.redirect('/profile')
}else{
  userHelpers.changeProfile(data).then((response)=>{
    if(response.status){
      res.redirect('/profile')
    }
})
}
})

module.exports = router;










// let products = [
//   {
//     name:"Iphone 11",
//     category:"Mobile",
//     description:"This is a good phone",
//     image:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQmCcMlk8eXyhqEZZ6ciRmQZSw-0MmDBFXkjQ&usqp=CAU"
//   },
//   {
//     name:"Iphone 11",
//     category:"Mobile",
//     description:"This is a good phone",
//     image:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQmCcMlk8eXyhqEZZ6ciRmQZSw-0MmDBFXkjQ&usqp=CAU"
//   },
//   {
//     name:"Iphone 11",
//     category:"Mobile",
//     description:"This is a good phone",
//     image:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQmCcMlk8eXyhqEZZ6ciRmQZSw-0MmDBFXkjQ&usqp=CAU"
//   },
//   {
//     name:"Iphone 11",
//     category:"Mobile",
//     description:"This is a good phone",
//     image:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQmCcMlk8eXyhqEZZ6ciRmQZSw-0MmDBFXkjQ&usqp=CAU"
//   }
// ]