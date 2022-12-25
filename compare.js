//* 8. The Call, Apply, and Bind Methods for function. Video 8 & 9 Folder 10

const lufthansa = {
    airline: 'Lufthansa',
    iataCode: 'LH',
    bookings: [],
    book(flightNum, name) {
        console.log(`${name} booked a seat on ${this.airline} flight ${this.iataCode}${flightNum}`);

        this.bookings.push({ flight: `${this.iataCode}${flightNum}`, name });
    }
};
// lufthansa.book(112, 'Muhammad Akbar');//Muhammad Akbar booked a seat on Lufthansa flight LH112

const eurowings = {
    airline: 'Eurowings',
    iataCode: 'EW',
    bookings: []
};

const swiss = {
    airline: 'Swiss Air',
    iataCode: 'SW',
    bookings: []
};

const book = lufthansa.book;

//Call method
book.call(eurowings, 555, 'Roger Federer');//argument pertama untuk ngasih tahu JS klo this keyword mengarah ke eurowings
//Roger Federer booked a seat on Eurowings flight EW555
book.call(swiss, 787, 'Martha Cooper');//Martha Cooper booked a seat on Swiss Air flight SW787

//Apply method
const flightData = [230, 'George Clooney'];
book.apply(lufthansa, flightData);//George Clooney booked a seat on Lufthansa flight LH230

//even better solution
book.call(eurowings, ...flightData);//George Clooney booked a seat on Eurowings flight EW230

//Bind method
const bookEW = book.bind(eurowings);
const bookLH = book.bind(lufthansa);
const bookKLX = book.bind(swiss);
bookEW(451, 'Rafa Nadal');//Rafa Nadal booked a seat on Eurowings flight EW451

const bookLH326 = book.bind(lufthansa, 326);
bookLH326('Coco Gauf');//Coco Gauf booked a seat on Lufthansa flight LH326

//With Event Listener
lufthansa.planes = 300;
lufthansa.buyPlane = function () {//ingat, arrow function ga bisa pake this keyword
    this.planes++;
    console.log(this.planes);
}
document.querySelector('.buy').addEventListener('click', lufthansa.buyPlane.bind(lufthansa));//< kata lufthansa terakhir utk memberitahukan JS bahwa this keyword dari function tersebut ke lufthansa object

//Partial Application (means we can preset parameter)
const addTax = (rate, value) => { console.log(`Your tax is ${value + value * rate}`); };
addTax(0.1, 200);//220

const addVAT = addTax.bind(null, 0.23);//< diisi null karena di function addTax nya ga ada this keyword
addVAT(500);//615

const addTaxRate = function (rate) {
    return function (value) {
        return value + value * rate;
    }
};
const addVAT23 = addTaxRate(0.23);
console.log(addVAT23(100));//123