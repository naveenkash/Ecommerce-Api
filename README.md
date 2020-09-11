# Ecommerce-api

To start with project you need to set some env var first.

### .env variables

| var name                 | value                          |
| ------------------------ | ------------------------------ |
| MONGO_URI                | mongodb uri to connect to db   |
| JWT_ACCESS_TOKEN_SECERET | secret token to sign jwt       |
| STRIPE_SECRET_KEY        | stripe secret key              |
| AWS_ACCESS_KEY           | aws access key                 |
| AWS_SECRET_KEY           | aws secret key                 |
| SENDGRID_API_KEY         | sendgrid api key to send mails |

## Example

```js
async function addToCart() {
  try {
    const res = await fetch("http://localhost:3000/cart/add", {
      method: "POST",
      headers: {
        Authorization: "Bearer JWT_token_received_when_signed_up",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        product_id: "5f2975006fe70c274078c781",
      }),
    });
    const data = await res.json();
    console.log(data);
  } catch (error) {
    console.log(error);
  }
}
addToCart();
```

### SignUp routes

##### Create a new user

```js
route : '/auth/account/signup/local',
method : POST,
body:{
    type:FormData,
    fields:{
        name: string,
        lastname: string,
        email: string,
        password: string,
        file: image, // optional
    }
}

description : `Create a new user and return user object wth jwt token for authorization purpose and a boolean
welcome_mail_sent to indicate if a welcome mail is sent to user`,

response_object : {
    "token":"jwt token",
    "user":{
        "user_id": string,
        "name": string,
        "lastname": string,
        "email": string,
        "img": {
            "key": string,
            "url": string
        },
        "created_at": timestamp,
        "display_name": string,
    },
    "welcome_mail_sent": boolean
}
```

### Login routes

##### Login user

```js
route : '/auth/account/login/local',
method : POST,
body:{
    fields:{
        email: email,
        password: password,
    }
}

description : `If a user found with email and authenticated return user object with a new jwt token`,

response_object : {
    "token":"jwt token",
    "user":{
        "user_id": string,
        "name": string,
        "lastname": string,
        "email": string,
        "img": {
            "key": string,
            "url": string
        },
        "created_at": timestamp,
        "display_name": string,
    }
}
```

### Product routes

Must be a admin to add update or delete product. Add a {"role":"admin"} field in user in db to create a admin

##### Get all products

```js
route : 'product/',
method : GET,

description : "Returns all products. returns empty array[] if no product available",

response_object : {
    "message": "Successfull",
    "products":[
        {
            "_id": string,
            "name": string,
            "price": string,
            "quantity": string,
            "description": string,
            "currency": string
            "images":[
                {
                    "_id": string,
                    "location": string
                }
            ],
            "average_review": number,
            "total_reviews": number,
            "total_stars": number,
            "created_at": timestamp
        }
    ]
}
```

<!-- ============================= -->

##### Search for product

```js
route : 'product/search?q=<text>&limit=<number>&last_time=<timestamp>',
method : GET,

description : `Search for product and returns an array sorted desc by created time. Return default 10 if no limit is
 provied max 100 to get second page use the last_time key in response`,

response_object : {
    "products":[
        {
            "_id": string,
            "name": string,
            "price": string,
            "quantity": string,
            "description": string,
            "currency": string
            "images":[
                {
                    "_id": string,
                    "location": string
                }
            ],
            "average_review": number,
            "total_reviews": number,
            "total_stars": number
            "created_at": timestamp
        }
    ],
    last_time:timestamp
}
```

<!-- ============================= -->

##### Get trending products

```js
route : 'product/trending?time=<timestamp>',
method : GET,

description : `Returns 4 trending products id's for past 1 day if time is not specified in query.
if trending products for past 1 week is needed provide 1 week timestamp in time query.
`,

response_object : {
    "trending_products":[
        {
            "id": string
        }
    ]
}
```

<!-- ============================= -->

##### Get a single product

```js
route : 'product/single/:productId',
method : GET,

description : "Get a single product",

response_object : {
    "message": "Successfull",
    "products":{
        "_id": string,
        "name": string,
        "price": string,
        "quantity": string,
        "description": string,
        "currency": string,
        "images":[
            {
                "_id": string,
                "location": string
            }
        ],
        "average_review":number,
        "total_reviews":number,
        "total_stars":number,
        "created_at": timestamp
    }
}
```

<!-- ============================= -->

##### Create a new product

Authorization required

```js
route : 'product/new',
method : POST,
body: {
    type: FormData,
    fields:{
        name: string,
        price: number,
        quantity: number,
        description: string,
        currency: string, // inr , usd , cad
        files: image,// multiple images or single image
    }
},

description : "Creates a new product",

response_object : {
    "message": "Successfull",
}
```

<!-- ============================= -->

##### Update a product

Authorization required

```js
route : 'product/update',
method : POST,
body: {
    "product_id":"product_id",
    "update_product":{
        name: string,
        price: number,
        description: string,
    }
},

description : "Update a product",

response_object : {
    "message": "updated",
}
```

### Cart routes

Authorization required

##### Get all cart items

```js
route : 'cart/',
method : POST,

description : "Get the current cart items",

response_object : {
    "cart": [
        {
            "_id": string
            "cart_id": string,
            "product_id": string,
            "user_id": string,
            "quantity": number,
            "price": number,
            "name": string,
            "description": string,
            "checkout": boolean,
        }
    ],
}
```

<!-- ============================= -->

##### Add a item to cart

Authorization required

```js
route : 'cart/add',
method : POST,
body:{
    product_id:"product_id",
    quantity: number // max 5
},

description : "Add the product to cart",

response_object : {
    "cart": [
        {
            "_id": string
            "cart_id": string,
            "product_id": string,
            "user_id": string,
            "quantity": number,
            "price": number,
            "name": string,
            "description": string,
            "checkout": boolean,
        }
    ],
}
```

<!-- ============================= -->

##### Remove a item from cart

Authorization required

```js
route : 'cart/remove',
method : POST,
body:{
    cart_item_id:"cart_item_id",
},

description : "Remove the product from cart",

response_object : {
     "message": "Removed successfully",
}
```

<!-- ============================= -->

##### Update cart item quantity

Authorization required

```js
route : 'cart/update',
method : POST,
body:{
    quantity: number // 1 to increment or -1 decrement,
},

description : `Increment or Decrement cart item quantity by 1.
 Min cart item quantity 1, max is 5`,

response_object : {
     "message": "Removed successfully",
}
```

<!-- ============================= -->

##### Checkout cart and charge customer

Authorization required

```js
route : 'cart/checkout',
method : POST,
body:{
    stripeToken: stripeToken // to charge the user on server,
    address:{
        city: string,
        state: string,
        postal_code: number,
        country: string,
    },
    phone: string
},

description : "Checkout user and calculate cart price on server and charge user with stripe",

response_object : {
    "order":{
        "_id": string,
        "user_id": string,
        "address":{
            "line1": string,
            "line2": string, // optional
            "city": string,
            "state": string,
            "country": string,
            "postal_code": number
        },
        "phone": string,
        "cart_id": string,
        "transaction_id": string,
        "payment_status": number,
        "total_price": number,
        "ordered_at": number,
        "order_status": number,
        "receipt_url": string
    }
}
```

### Feedback routes

Authorization required

##### Get feedbacks on a product

```js
route : 'product/fedback/all',
method : POST,
body:{
    product_id: string,
    last_time: timestamp,
    limit: number
},

description : `Returns the latest feedbacks on product. Return default 10 if no limit is
 provied max 100 to get second page use the last_time key in response`,

response_object : {
     "feedbacks":[
        {
            "_id": string
            "product_id": string,
            "stars": number,
            "feedback": string,
            "user_id": string,
            "created_at": timestamp
        }
     ],
     length: number,
     last_time: number
}
```

<!-- ============================= -->

##### Create or update a feedback on product

```js
route : 'product/fedback/create',
method : POST,
body:{
    product_id: string,
    feedback: string, // optional
    stars: number // required if creating new feedback
},

description : `If a feedback is not created it will create the feedback but if a feedback
is already created it will update the feedback.
 Product needs to be purchased to create a feedback`,

response_object : {
    "message": "Done!",
}
```

<!-- ============================= -->

##### Get the user feedback on a product if any

```js
route : 'product/fedback/user/:productId',
method : POST,

description : "Get the user feedback if any on a product",

response_object : {
    feedback: {
        "_id": string
        "product_id": string,
        "stars": number,
        "feedback": string,
        "user_id": string,
        "created_at": timestamp
    }
}
```

<!-- ============================= -->

##### Remove a feedback from a product

```js
route : 'product/fedback/remove',
method : POST,
body:{
    product_id: string
}

description : "Remove a user feedback on a product",

response_object : {
    "message": "Removed successfully"
}
```

### User routes

Authorization required

##### Update user profile

```js
route : 'user/update',
method : POST,
body:{
    type: FormData,
    fields:{
        name: string,
        lastname: string,
        email: string,
        file: image
    }
}

description : "Update user profile",

response_object : {
    "message": "updated!"
}
```

### Order routes

Authorization required

##### Get all user orders

```js
route : 'order/',
method : POST,

description : "Get user's all order successfull or failed",

response_object : {
    "orders":[
        {
            "_id": string,
            "user_id": string,
            "address":{
                "line1": string,
                "line2": string,
                "city": string,
                "state": string,
                "country": string,
                "postal_code": number
            },
            "phone": string,
            "cart_id": string,
            "transaction_id": string,
            "payment_status": number,
            "total_price": number,
            "ordered_at": number,
            "order_status": number,
            "receipt_url": string
        }
    ]
}

```

##### Cancel order

```js
route : 'order/cancel',
method : POST,
body:{
    fields:{
        order_id: string,
    }
}
description : "Cancel order",

response_object : {
    "message": string,
    "cancellation_email_sent": boolean
}
```
