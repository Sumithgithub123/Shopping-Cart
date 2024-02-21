var express = require('express');
var router = express.Router();
var adminHelper = require('../helpers/admin-helpers')

const verifyLogin = (req,res,next)=>{
    if(req.session.superloggedIn){
    next()
  }else{
    res.redirect('/superadmin/login')
  }
  }

router.get('/',verifyLogin,(req,res)=>{
    adminHelper.getdelivery().then((orders)=>{
        res.render('superadmin/deliverycontrol',{orders,super:true,superadmindetails:req.session.super})
    })
})

router.get('/login',function(req,res){
    if(req.session.super){
      res.redirect('/superadmin')
    }else{
      res.render('superadmin/login',{super:true,logginErr:req.session.superlogginErr})
      req.session.superlogginErr = false
    }
  })

  router.post('/login',(req,res)=>{
    adminHelper.doLogin(req.body).then((response)=>{
      if(response.status){
        req.session.super = response.super
        req.session.superloggedIn = true
        res.redirect('/superadmin')
      }else{
        req.session.superlogginErr = true
        res.redirect('/superadmin/login')
      }
    })
  })

  // router.get('/signup',function(req,res){
  //   res.render('superadmin/signup',{super:true})
  // })
  
  router.post('/signup',(req,res)=>{
    adminHelper.doSignup(req.body).then((response)=>{
        //console.log(response)
        req.session.super = response
        req.session.superloggedIn = true
        res.redirect('/superadmin')
    })
  })
  
  router.get('/logout',(req,res)=>{
    req.session.super = null
    req.session.superloggedIn = null
    res.redirect('/superadmin')
  })

  router.post('/changedeliverystatus',(req,res)=>{
    adminHelper.changedeliverystatus(req.body.orderId,req.body.value).then((response)=>{
       res.json(response)
    })
  })

  router.get('/alladmin',verifyLogin,(req,res)=>{
    adminHelper.alladmin().then((alladmin)=>{
         res.render('superadmin/alladmin',{alladmin,super:true,superadmindetails:req.session.super})
    })
  })

  router.get('/alluser',verifyLogin,(req,res)=>{
    adminHelper.alluser().then((alluser)=>{
      res.render('superadmin/alluser',{super:true,superadmindetails:req.session.super,alluser})
    })
  })

  router.get('/allorders',verifyLogin,(req,res)=>{
    adminHelper.allorders().then((allorders)=>{
        res.render('superadmin/allorders',{super:true,superadmindetails:req.session.super,allorders})
    })
  })

  router.get('/view-order-products/:id',verifyLogin,(req,res)=>{
    adminHelper.getorderedproduct(req.params.id).then((products)=>{
       res.render('superadmin/view-order-product',{products,super:true,superadmindetails:req.session.super})
    })
  })

module.exports = router;