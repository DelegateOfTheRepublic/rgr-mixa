import {STRING, INTEGER, FLOAT, BOOLEAN, ENUM, DATE, Model, JSON, Op} from 'sequelize'
import { seq } from './db.js'
import {ORDER_STATUSES, PAYMENT_METHODS, ROLE_TYPES} from "../consts.js"
import _ from "lodash";
import cart from "../controllers/cart.js";
import discount from "../controllers/discount.js";


class Product extends Model {
    async getCategory() {
        return await Category.findByPk(this.categoryId)
    }

    async getSubcategory() {
        return await Subcategory.findByPk(this.subcategoryId)
    }

    async getImagePath() {
        const categoryName = (await this.getCategory()).name
        const subcategoryName = (await this.getSubcategory()).name

        return `uploads/${categoryName}/${subcategoryName}`
    }

    async getRating() {
        const stars = (await Rating.findOne({
            where: {
                productId: this.id,
            }
        })).stars

        const rating = _.sum(stars.map((star, index) => star * (index + 1))) / _.sum(stars)

        return rating
    }

    async getDiscount() {
        const categoryId = (await this.getCategory()).id
        const subcategoryId = (await this.getSubcategory()).id

        const dicsount = await Discount.findOne({
            where: {
                productId: this.id,
                [Op.or]: { categoryId },
                [Op.or]: { subcategoryId }
            }
        })

        return !_.isNull(dicsount)? dicsount.value : 0
    }
}

Product.init(
    {
        manufacturer: {
            type: STRING,
            allowNull: false,
        },
        model: {
            type: STRING,
            allowNull: false,
        },
        weight: {
            type: FLOAT,
            allowNull: false,
        },
        price: {
            type: FLOAT,
            allowNull: false,
        },
        ratingNumber: {
            type: INTEGER,
            defaultValue: 0
        },
        stockQuantity: {
            type: INTEGER,
            allowNull: false,
        },
        image: {
            type: STRING,
            allowNull: false,
        }
    },
    {
        sequelize: seq,
        timestamps: false,
    }
)

const Rating = seq.define('rating', {
    id: {
        type: INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true,
    },
    stars: {
        type: JSON,
        defaultValue: [0, 0, 0, 0, 0]
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

const Subcategory = seq.define('subcategory', {
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

const Discount = seq.define('discount', {
    id: {
        type: INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true,
    },
    value: {
        type: FLOAT,
        allowNull: false,
    }
})

const OrderHistory = seq.define('order_history', {
    id: {
        type: INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true,
    },
    number: {
        type: STRING
    },
    status: {
        type: STRING
    },
    payment: {
        type: STRING,
    },
    totalCost: {
        type: FLOAT,
    },
    discountedTotalCost: {
        type: FLOAT
    },
    formationDate: {
        type: DATE,
    },
    arrivalDate: {
        type: DATE,
    },
    receiveDate: {
        type: DATE
    },
})

const OrderHistory_Product = seq.define('order_history_product', {
    id: {
        type: INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true,
    },
    amount: {
        type: INTEGER,
    },
    price: {
        type: FLOAT,
    },
    discount: {
        type: FLOAT
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

class Order extends Model {
    async getDiscountedTotalCost() {
        const orderedProducts = await Order_Product.findAll({
            where: {
                orderId: this.id,
            }
        })

        const discountedTotalCost = await orderedProducts.reduce(
            async (total, orderedProduct) => {
                const discountValue = await (await Product.findByPk(orderedProduct.id)).getDiscount()
                total += (1 - discountValue) * orderedProduct.getCost()

                return total
            },
            0
        )

        return discountedTotalCost
    }

    async moveToHistory() {
        const orderHistory = await OrderHistory.create({
            userId: this.userId,
            number: this.number,
            status: ORDER_STATUSES.CANCELED,
            payment: this.payment,
            totalCost: this.totalCost,
            discountedTotalCost: await this.getDiscountedTotalCost(),
            formationDate: this.createdAt,
            arrivalDate: this.arrivalDate,
            receiveDate: this.receiveDate,
            shippingAddressId: this.shippingAddressId,
        })

        const orderProductRaws = (await this.getProducts()).map(
            async function(product) {
                const orderProduct = await Order_Product.findOne({
                    where: {
                        orderId: this.id,
                        productId: product.id,
                    }
                })

                return {
                    product: product,
                    orderProduct: orderProduct,
                }
            }
        )
        for (let orderProductRaw of orderProductRaws) {
            await orderHistory.addProduct(orderProductRaw.product, {
                through: {
                    amount: orderProductRaw.orderProduct.amount,
                    price: orderProductRaw.orderProduct.price,
                    discount: await orderProductRaw.product.getDiscount()
                }
            })
            if (this.status === ORDER_STATUSES.CANCELED) {
                await Product.increment(
                {
                        stockQuantity: orderProductRaw.orderProduct.amount
                    },
                    {
                        where: {
                            id: orderProductRaw.product.id
                        }
                    })
            }
        }

        await Order.destroy({
            where: {
                id: this.id,
            }
        })

        return orderHistory
    }
}

Order.init(
    {
        number: {
            type: STRING,
            set(value) {
                if (_.isNull(this.getDataValue('number'))) {
                    this.setDataValue('number', value);
                } else {
                    throw new Error("Field 'number' is readonly")
                }
            }
        },
        status: {
            type: ENUM,
            values: Object.values(ORDER_STATUSES),
            defaultValue: ORDER_STATUSES.AWAITING_PAYMENT
        },
        payment: {
            type: ENUM,
            values: Object.values(PAYMENT_METHODS),
            defaultValue: PAYMENT_METHODS.BY_CREDIT_CARD_ONLINE
        },
        totalCost: {
            type: FLOAT,
            defaultValue: 0
        },
        arrivalDate: {
            type: DATE,
        },
        receiveDate: {
            type: DATE
        },
    },
    {
        sequelize: seq
    }
)

class Cart extends Model {
    static async updateTotalCosts(product) {
        const cartProducts = await Cart_Product.findAll({
            where: {
                productId: product.id
            }
        })

        for (let cartProduct of cartProducts) {
            let oldCost = cartProduct.cost
            await cartProduct.update({
                cost: cartProduct.amount * product.price,
            })
            const cart = await Cart.findByPk(cartProduct.cartId)
            await cart.update({
                totalCost: cart.totalCost - oldCost + cartProduct.cost,
            })
        }
    }

    async getProductCost(productId) {
        const cartProduct = await Cart_Product.findOne({
            where: {
                cartId: this.id,
                productId,
            }
        })

        return cartProduct.cost
    }
}

Cart.init(
    {
        totalCost: {
            type: FLOAT
        }
    },
    {
        sequelize: seq,
    }
)

class User extends Model {
    async getCart() {
        return await Cart.findByPk(this.cartId, { include: Product })
    }

    async getOrders() {
        const activeOrders = await Order.findAll({
            where: {
                userId: this.id,
            },
            include: Product
        })
        const receivedOrders = await OrderHistory.findAll({
            where: {
                userId: this.id,
            },
            include: Product
        })

        return {
            active: activeOrders,
            received: receivedOrders
        }
    }
}

User.init(
    {
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
        },
        role: {
            type: ENUM,
            values: Object.values(ROLE_TYPES),
            defaultValue: ROLE_TYPES.CUSTOMER,
        }
    },
    {
        sequelize: seq
    }
)

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

class Order_Product extends Model {
    getCost() {
        return this.amount * this.price
    }
}

Order_Product.init(
    {
        amount: {
            type: INTEGER,
            defaultValue: 1,
        },
        price: {
            type: FLOAT,
        }
    },
    {
        sequelize: seq,
        timestamps: false,
    }
)

const Cart_Product = seq.define('Cart_Product', {
    amount: {
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
User.hasMany(Order, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
User.hasMany(OrderHistory, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
Product.belongsToMany(Cart, { through: Cart_Product })
Cart.belongsToMany(Product, { through: Cart_Product })
Cart.hasOne(User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
ShippingAddress.hasMany(Order, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
ShippingAddress.hasMany(OrderHistory, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
Product.belongsToMany(Order, { through: Order_Product })
Order.belongsToMany(Product, { through: Order_Product })
Product.belongsToMany(OrderHistory, { through: OrderHistory_Product })
OrderHistory.belongsToMany(Product, { through: OrderHistory_Product })
Product.belongsToMany(User, { through: 'Wishlist' })
User.belongsToMany(Product, { through: 'Wishlist' })
Product.hasOne(Discount, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
Category.hasOne(Discount, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
Subcategory.hasOne(Discount, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
Subcategory.hasMany(Product, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
Category.hasMany(Subcategory, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
Product.hasOne(Rating, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })


export {
    Cart, Category, Cart_Product, Discount, Order, Order_Product, OrderHistory, OrderHistory_Product, Product,
    Rating, ShippingAddress, Subcategory, Token, User
}
