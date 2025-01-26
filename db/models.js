import { STRING, INTEGER, FLOAT, BOOLEAN, ENUM } from 'sequelize'
import { seq } from './db.js'


const Product = seq.define('product', {
    id: {
        type: INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true,
      },
    type: {
        type: STRING,
        allowNull: false,
    },
    price: {
        type: FLOAT,
        allowNull: false,
      },
    image: {
        type: STRING,
        allowNull: false,
    }
})

const Category = seq.define('category', {
    id: {
        type: INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true,
      },
    name: {
        type: STRING,
        allowNull: false,
    }
})

const ShippingAddress = seq.define('shipping_address', {
    id: {
        type: INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true,
    },
    address: {
        type: STRING,
        allowNull: false,
    }
})

const Order = seq.define('order', {
    id: {
        type: INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true,
    },
    status: {
        type: ENUM,
        values: ['собирается', 'доставляется', 'готов к получению'],
        defaultValue: 'собирается'
    },
    payment: {
        type: ENUM,
        values: ['кредитной картой онлайн', 'наличный рассчет', 'при получении'],
        defaultValue: 'кредитной картой онлайн'
    },
    totalCost: {
        type: FLOAT,
    }
})

const Cart = seq.define('cart', {
    id: {
        type: INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true,
    },
    totalCost: {
        type: FLOAT
    }
})

const User = seq.define('user', {
      id: {
        type: INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true,
      },
      email: {
        type: STRING,
        allowNull: false,
      },
      password: {
        type: STRING,
        allowNull: false,
      },
      isActivated: {
        type: BOOLEAN,
        defaultValue: false,
      }
})

const Token = seq.define('token', {
      id: {
        type: INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true,
      },
      token: {
        type: STRING,
        allowNull: false
      }
})

const Order_Product = seq.define('Order_Product', {
    productAmount: {
        type: INTEGER,
        defaultValue: 1,
    },
    cost: {
        type: FLOAT,
        allowNull: false,
    }
})

const Cart_Product = seq.define('Cart_Product', {
    productAmount: {
        type: INTEGER,
        defaultValue: 1
    },
    cost: {
        type: FLOAT,
        allowNull: false,
    }
})

Category.hasMany(Product, { onDelete: 'CASCADE', onUpdate: 'CASCADE'})
User.hasOne(Token, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
Product.belongsToMany(Cart, { through: Cart_Product })
Cart.belongsToMany(Product, { through: Cart_Product })
Cart.hasOne(User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
Order.hasMany(ShippingAddress, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
ShippingAddress.hasMany(Order, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
User.hasMany(Order, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
Product.belongsToMany(Order, { through: Order_Product })
Order.belongsToMany(Product, { through: Order_Product })

export { Cart, Category, Cart_Product, Order, Order_Product, Product, ShippingAddress, Token, User }
