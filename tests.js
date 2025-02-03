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
import {Discount, Subcategory} from "./db/models.js";

// const rating = _.sum([1, 1, 0, 1, 10].map((star, index) => star * (index + 1))) / 13;
// console.log(rating);
// const [model, idPart] = _.split('productId', 'Id')
// const asd = []
// asd.push({ ['asd']: 123 })
// console.log(asd)

// import {CronJob} from "cron";
//
// const SECONDS_TO_WAIT = 10;
//
// const dateToRunCode = new Date(new Date().setSeconds(new Date().getSeconds() + SECONDS_TO_WAIT));
// console.log(dateToRunCode)
//  new CronJob(
//    dateToRunCode,
//    function(){
//      console.log("This code will run once.");
//    },
// ).start();

console.log(new Date(new Date().setDate(new Date().getDay() + 30)))
