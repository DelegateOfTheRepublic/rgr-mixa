// import { Rating } from "./db/models.js";
//
// const rating = await Rating.create({
//     productId: 1,
//     stars: [1, 2, 3, 4, 5]
// })
//
// console.log(rating.toJSON())

import _ from "lodash";
import {RATING_STARS} from "./consts.js";
import {Discount} from "./db/models.js";

// const rating = _.sum([1, 1, 0, 1, 10].map((star, index) => star * (index + 1))) / 13;
// console.log(rating);
const [model, idPart] = _.split('productId', 'Id')
const asd = []
asd.push({ ['asd']: 123 })
console.log(asd)
