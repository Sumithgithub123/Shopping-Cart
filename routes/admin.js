var express = require('express');
var router = express.Router();
var productHelper = require('../helpers/product-helpers');
const productHelpers = require('../helpers/product-helpers');

const verifyLogin = (req,res,next)=>{
  if(req.session.adminloggedIn){
  next()
}else{
  res.redirect('/admin/login')
}
}


/* GET users listing. */
router.get('/', verifyLogin,function(req, res, next) {
  let admindetails = req.session.admin
  productHelper.getAdminproducts(admindetails._id).then((products)=>{
    res.render('admin/view-products',{admin:true,products,admindetails});
  })
});

router.get('/login',function(req,res){
  if(req.session.admin){
    res.redirect('/admin')
  }else{
    res.render('admin/login',{admin:true,logginErr:req.session.adminlogginErr})
    req.session.adminlogginErr = false
  }
})

router.post('/login',(req,res)=>{
  productHelper.doLogin(req.body).then((response)=>{
    if(response.status){
      req.session.admin = response.admin
      req.session.adminloggedIn = true
      res.redirect('/admin')
    }else{
      req.session.adminlogginErr = true
      res.redirect('/admin/login')
    }
  })
})

router.get('/signup',function(req,res){
  res.render('admin/signup',{admin:true,signupErr:req.session.adminsignupErr})
  req.session.adminsignupErr = false
})

router.post('/signup',(req,res)=>{
  productHelper.doSignup(req.body).then((response)=>{
      if(response.status){
         req.session.adminsignupErr = true
         res.redirect('/admin/signup')
      }else{
        //console.log(response)
      req.session.admin = response
      req.session.adminloggedIn = true
      res.redirect('/admin')
      }
  })
})

router.get('/logout',(req,res)=>{
  req.session.admin = null
  req.session.adminloggedIn = null
  res.redirect('/admin')
})

router.get('/add-product',verifyLogin,function(req,res){
  res.render('admin/add-product',{admin:true,admindetails:req.session.admin})
})


router.post('/add-product',function(req,res){
  // console.log(req.body)
  // console.log(req.files.image)
  productHelper.addProduct(req.body,function(id){
    //console.log(id)
    let img = req.files.image
    img.mv('public/product-images/'+id+'.png',(err)=>{
      if(!err)
      {
        res.redirect('/admin/add-product')
      }else{
        console.log(err);
      }
    })
  })
})

router.get('/delete-product/:id',(req,res)=>{
let proId=req.params.id
productHelper.deleteProduct(proId).then((response)=>{
  res.redirect('/admin')
})
})

router.get('/edit-product/:id',verifyLogin,async(req,res)=>{
  let product =await productHelper.getproductDetails(req.params.id)
  //console.log(product)
  res.render('admin/edit-product',{product,admin:true,admindetails:req.session.admin})
})

router.post('/edit-product/:id',(req,res)=>{
  let id = req.params.id
  productHelper.updateproduct(req.params.id,req.body).then(()=>{
    res.redirect('/admin')
    if(req.files.image){
      let img = req.files.image
      img.mv('public/product-images/'+id+'.png')
    }
  })
})

router.get('/allorders',verifyLogin,(req,res)=>{
  productHelper.getadminorders(req.session.admin._id).then((orders)=>{
    res.render('admin/allorders',{admin:true,orders,admindetails:req.session.admin})
  })
})

router.get('/view-order-products/:id/:id1',verifyLogin,(req,res)=>{
  productHelper.getadminorderedpro(req.params.id,req.params.id1,req.session.admin._id).then((products)=>{
     res.render('admin/view-order-product',{products,admin:true,admindetails:req.session.admin})
  })
})

router.get('/profile',verifyLogin,((req,res)=>{
  productHelper.getadmin(req.session.admin._id).then((admindetail)=>{
    req.session.admin = admindetail
    res.render('admin/profile',{admin:true,admindetails:req.session.admin,profile:true})
  })
}))

router.post('/profile',(req,res)=>{
  let id = req.body.adminId
  let img = req.files.image
  img.mv('public/images/admin/'+id+'.png',(err)=>{
   if(!err){
    res.redirect('/admin/profile')
   }else{
    console.log(err)
   }
  })
})

router.post('/changeprofile',(req,res)=>{
  let data = req.body
  if(!data.name && !data.email){
    res.redirect('/admin/profile')
}else{
  productHelper.changeProfile(data).then((response)=>{
    if(response.status){
      res.redirect('/admin/profile')
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