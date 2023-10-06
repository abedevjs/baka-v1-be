const schedule = require("node-schedule");
const Bagasi = require("../model/bagasiModel");
const Order = require("../model/orderModel");

const catchAsync = require("./catchAsync");
const AppError = require("./appError");

const now = new Date();
const date = now.getDate();
const month = now.getMonth() + 1;
const year = now.getFullYear();
// console.log(now.getTime() < bagasi.waktuBerangkat);

const status = async (Model, str0, str1, str2) => {
  //todo Menentukan patokan. Tanggal hari ini
  const time = new Date();
  const today = time.getTime();
  // console.log(today);//1688278309425 = timestamp
  // console.log(new Date(today)); //2023-07-02T06:12:01.690Z
  // console.log(time.toISOString()); //2023-07-02T06:13:24.395Z
  // console.log(Date.now());// 1688278481239 = timestamp
  // console.log(today > new Date('2023-07-03T00:00:00.000+00:00'));
  // const ini = new Date('2023-04-01T00:00:00.000+00:00').getTime() + 86400000;
  // const itu = new Date('2023-04-03T00:00:00.000+00:00').getTime() + -86400000;

  //todo Scan Model.status, value nya dlm bentuk [] Array Literal. jika tdk ada return;
  const [query] = await Model.find({ status: str1 });
  // console.log('🫠', typeof(query));
  // console.log(Array.isArray(query));
  // console.log();
  // console.log(query == []);
  if (!query) return;

  //todo Scan lagi, kali ini valuenya dlm bentuk {}.
  const modelStatus = await Model.find({ status: str1 });
  // console.log('🤣', typeof(modelStatus));
  // const ty = modelStatus.map(el => console.log(new Date(el.waktuTiba.getTime() + (86400000 * 2))));
  // const xx = modelStatus.map(el => console.log(new Date(el.waktuTiba.getTime() + 86400000)));
  // console.log(today > xx);

  //todo Memberikan value H+1 atau H-1
  let num = str0 == "+1" ? 86400000 : -86400000;

  //todo Menentukan variabel perbandinggan menggunakan 'waktuTiba' atau 'waktuBerangkat'
  let wkt = str1 == "Ready" ? "waktuTiba" : "waktuBerangkat";

  //todo Jika parameter(Model == Order)
  let timm = [];
  if (Model == Order) {
    await Promise.all(
      modelStatus.map(async (el) => {
        const ids = el.bagasi._id;
        const time = await Bagasi.findById(ids);
        return str1 == "Ready"
          ? timm.push(new Date(time.waktuTiba.getTime() + num))
          : timm.push(new Date(time.waktuBerangkat.getTime() + num));
      })
    );
  }

  //todo Jika parameter(Model == Bagasi)
  let ular =
    Model == Bagasi
      ? modelStatus.map((el) => new Date(el[wkt].getTime() + num))
      : timm;
  // console.log(ular);
  // console.log(modelStatus.map(el => el.waktuBerangkat))
  // console.log(new Date(today));
  // console.log(modelStatus.map(el => new Date(el.waktuBerangkat.getTime() + num)));

  //todo Reassign value ke array utk di compare
  const [statusDate] = ular;
  // console.log(new Date(today).toDateString());
  // console.log(statusDate.toDateString());
  // console.log(new Date(today).toDateString() == statusDate.toDateString());

  //todo Membandingkan tanggal hari ini dan tanggal keberangkatan/tiba
  if (new Date(today).toDateString() == statusDate.toDateString()) {
    modelStatus.map(async (el) => {
      const ese = await Model.findByIdAndUpdate(
        el.id,
        {
          status: str2,
        },
        {
          new: true,
          runValidators: true,
        }
      );
      if (!ese) return;
    });
  }
};

//! Execute ONCE A WEEK
//* Mengubah Bagasi.status = Closed dan Canceled ke Bagasi.active = false
//* Mengubah Order.status = Delivered dan Canceled ke Order.active = false

const changeActive = catchAsync(async () => {
  //! UNTUK BAGASI MODEL
  //todo scan Bagasi.status yg Closed dan Canceled.
  const statusCloseCancel = await Bagasi.find({
    $or: [{ status: "Closed" }, { status: "Canceled" }],
  });

  if (!statusCloseCancel) return;

  //todo Jika true, Bagasi.active = false
  const changeActive = statusCloseCancel.map(async (el) => {
    await Bagasi.findByIdAndUpdate(
      el._id,
      { active: false },
      {
        new: true,
        runValidators: true,
      }
    );
  });
  if (!changeActive) return;

  //! UNTUK ORDER MODEL
  //todo scan Order.status yg Delivered dan Canceled. Jika true, Order.active = false
  const statusDeliverCancel = await Order.find({
    $or: [{ status: "Delivered" }, { status: "Canceled" }],
  });
  if (!statusDeliverCancel) return;

  //todo Jika true, Order.active = false
  const modifyActive = statusDeliverCancel.map(async (el) => {
    await Order.findByIdAndUpdate(
      el._id,
      { active: false },
      {
        new: true,
        runValidators: true,
      }
    );
  });
  if (!modifyActive) return;
});

//! Execute ONCE A DAY
//* Mengubah Bagasi.status = 'Opened' to 'Closed' dan 'Scheduled' to 'Canceled'
//* Mengubah Order.status = 'Ready' to 'Delivered'dan 'Preparing' to 'Canceled'
const changeStatus = catchAsync(async () => {
  //todo Scan Bagasi.status = Opened. Jika H-1 Bagasi.tglBrkt = Bagasi.status = Closed
  await status(Bagasi, "-1", "Opened", "Closed");

  //todo scan Bagasi.status = Scheduled. Jika H-1 Bagasi.tglBrkt = Bagasi.status = Canceled
  await status(Bagasi, "-1", "Scheduled", "Canceled");

  //todo scan Order.status = Ready. Jika H+1 Bagasi.tglTiba = Order.status = Delivered
  await status(Order, "+1", "Ready", "Delivered");

  //todo scan Order.status = Preparing. Jika H-1 Bagasi.tglBrkt = Order.status = Canceled
  await status(Order, "-1", "Preparing", "Canceled");
});

const scheduleActive = () => {
  schedule.scheduleJob("0 0 1 * *", function () {
    //! Triggered ONCE A MONTH
    // console.log('Triggered ONCE A MONTH!');
    // console.log(`Triggered at: ${new Date()}`);
    changeActive();
  });
};

const scheduleStatus = () => {
  schedule.scheduleJob("0 0 * * *", function () {
    //! Triggered ONCE A DAY
    // console.log("Triggered ONCE A DAY!");
    // console.log(`Triggered at: ${new Date()}`);
    changeStatus();
  });
};

exports.startJob = () => {
  scheduleActive();
  scheduleStatus();
};
