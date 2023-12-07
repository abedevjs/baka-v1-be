const schedule = require("node-schedule");
const Bagasi = require("../model/bagasiModel");
const Order = require("../model/orderModel");
const UserAuth = require("../model/userAuthModel");

const today = new Date();

//! BAGASI Case
//* CASE 1a. h-1 waktuBerangkat, Bagasi'Scheduled' to 'Canceled', pull id from User, daily
//* CASE 1b. h-1 waktuBerangkat, Bagasi 'Opened' to 'Closed' , daily
//* CASE 2. Bagasi 'Closed' to 'Unloaded', pull id from User, daily
//! ORDER Case
//* CASE 3a. Bagasi.Full, Order 'Preparing' to 'Postponed', pull id from User, daily
//* CASE 3b. h-1 waktuBerangkat Bagasi, Order 'Preparing' to 'Postponed', pull id from User, daily
//* CASE 4. h+3 waktuTiba Bagasi, Order 'Ready' to 'Delivered', pull id from User, daily
//* CASE 5. Bagasi 'Unloaded dan Bagasi 'Canceled', active true ke active false, not pull id, monthly
//* CASE 6. Order 'Delivered' dan Order 'Postponed', active true ke active false, not pull id, monthly

//! Execute Daily
//* CASE 1a. h-1 waktuBerangkat, Bagasi'Scheduled' to 'Canceled', pull id from User, daily
const setBagasiScheduledToCanceled = async () => {
  try {
    //todo 1. Find Bagasi 'Scheduled'.
    // const statusScheduledAndOpened = await Bagasi.find({
    //   $or: [{ status: "Scheduled" }, { status: "Opened" }],
    // });
    const statusScheduled = await Bagasi.find({ status: "Scheduled" });

    //todo 2. Loop hasil dari todo 1, dlm loop tsb di filter dgn comparation antara today == (wktBerangkat - 25hours) h-1 dari waktuBerangkat
    const bagasiDeadline = statusScheduled.filter(
      (bagasi) => today.getTime() >= bagasi.waktuBerangkat.getTime() - 90000000
    );

    //todo 3. Yg lolos dari todo 2, ganti status 'Scheduled' to 'Canceled'.
    const setBagasiStatus = await Promise.all(
      bagasiDeadline.map(
        async (bagasi) =>
          await Bagasi.findByIdAndUpdate(
            bagasi._id,
            { status: "Canceled" },
            { new: true }
          )
      )
    );

    if (!setBagasiStatus) return;

    //todo 4. Yg lolos dari todo 3, bagasiId nya di pull dr UserAuth.bagasi
    const removeBagasiID = await Promise.all(
      setBagasiStatus.map(
        async (bagasi) =>
          await UserAuth.findByIdAndUpdate(
            bagasi.owner._id,
            {
              $pull: { bagasi: { $in: [bagasi._id] } },
            },
            { new: true, runValidators: true }
          )
      )
    );

    if (!removeBagasiID) return;

    console.log(
      `successfully executing nodeSchedule: setBagasiScheduledToCanceled, at: ${new Date()}`
    );
  } catch (err) {
    console.log(err);
  }
};

//! Execute Daily
//* CASE 1b. h-1 waktuBerangkat, Bagasi 'Opened' to 'Closed' , daily
const setBagasiOpenedToClosed = async () => {
  try {
    //todo 1. Find Bagasi 'Opened'
    // const statusScheduledAndOpened = await Bagasi.find({
    //   $or: [{ status: "Scheduled" }, { status: "Opened" }],
    // });
    const statusOpened = await Bagasi.find({ status: "Opened" });

    //todo 2. Loop hasil dari todo 1, dlm loop tsb di filter dgn comparation antara today == (wktBerangkat - 25hours) h-1 dari waktuBerangkat
    const bagasiDeadline = statusOpened.filter(
      (bagasi) => today.getTime() >= bagasi.waktuBerangkat.getTime() - 90000000
    );

    //todo 3. Yg lolos dari todo 2, ganti status 'Opened' to 'Closed'.
    const setBagasiStatus = await Promise.all(
      bagasiDeadline.map(
        async (bagasi) =>
          await Bagasi.findByIdAndUpdate(
            bagasi._id,
            { status: "Closed" },
            { new: true }
          )
      )
    );

    if (!setBagasiStatus) return;

    console.log(
      `successfully executing nodeSchedule: setBagasiOpenedToClosed, at: ${new Date()}`
    );
  } catch (err) {
    console.log(err);
  }
};

//! Execute Daily
//* CASE 2. Bagasi 'Closed' to 'Unloaded', pull id from User, daily
const setBagasiClosedToUnloaded = async () => {
  try {
    //todo 1. Find Bagasi 'Closed'
    const bagasisClosed = await Bagasi.find({ status: "Closed" });

    //todo 2. Membuat property baru dalam Bagasi yaitu array orderStatus: ['Ready', 'Delivered', 'Ready']
    const bagasiWithOrdersStatus = await Promise.all(
      bagasisClosed.map(async (bagasi) => ({
        ...bagasi,
        orderStatus: await Promise.all(
          bagasi.order.map(async (id) => (await Order.findById(id)).status)
        ),
      }))
    );

    //todo 3. Hasil dari todo 2, filter tiap bagasi yg di dlm filter tsb orderStatus dari Bagasi tsb semuanya 'Delivered'
    const filterBagasis = bagasiWithOrdersStatus.filter((bagasi) =>
      bagasi.orderStatus.every((status) => status == "Delivered")
    );
    if (filterBagasis.length == 0) return;

    //todo 4. if all the orderStatus are 'Delivered', change Bagasi.status to 'Unloaded'
    const setClosedToUnloaded = await Promise.all(
      filterBagasis.map(
        async (bagasi) =>
          await Bagasi.findByIdAndUpdate(
            bagasi._doc._id,
            { status: "Unloaded" },
            { new: true }
          )
      )
    );
    setClosedToUnloaded.map((bagasi) => console.log(bagasi._id, bagasi.status));
    if (!setClosedToUnloaded) return;

    //todo 5. if all the orderStatus are 'Delivered', remove the bagasiID from Owner.bagasi
    const removeBagasiID = await Promise.all(
      setClosedToUnloaded.map(
        async (bagasi) =>
          await UserAuth.findByIdAndUpdate(
            bagasi.owner._id,
            {
              $pull: { bagasi: { $in: [bagasi._id] } },
            },
            { new: true }
          )
      )
    );
    if (!removeBagasiID) return;

    console.log(
      `successfully executing nodeSchedule: setBagasiClosedToUnloaded, at: ${new Date()}`
    );
  } catch (err) {
    console.log(err);
  }
};

//! Execute Daily
//* CASE 3a. Bagasi jika Full, Order 'Preparing' to 'Postponed', pull id Order from arr User.order, pull id orderBagasi from arr User.orderBagasiId,  daily
const setFullOrderPreparingToPostponed = async () => {
  try {
    //todo 1. Find Order 'Preparing'
    const ordersPreparing = await Order.find({ status: "Preparing" });
    if (!ordersPreparing) return;

    //todo 2. Menambahkan statusBagasi ke dlm ordersPreparing dari Bagasi reference Order tsb
    const ordersWithStatusBagasi = await Promise.all(
      ordersPreparing.map(async (order) => ({
        ...order,
        statusBagasi: (await Bagasi.findById(order.bagasi._id)).status,
      }))
    );

    //todo 3. Loop hasil dari todo 2, dlm loop tsb di filter, ambil Bagasi.status closed
    let filterOrders = ordersWithStatusBagasi.filter(
      (order) => order.statusBagasi == "Closed"
    );
    if (filterOrders.length == 0) return;

    //todo 4. Yg lolos dari todo 3, ganti status dari 'Preparing' ke 'Postponed'
    const setPreparingToPostponed = await Promise.all(
      filterOrders.map(
        async (order) =>
          await Order.findByIdAndUpdate(
            //Perhatikan ini nama id nya ada .doc._id krn document mongo kita manipulate di todo 2, jd struktur document nya otomatis berubah, tdk sama lg dgn struktur dokumen mongo yg biasanya.
            order._doc._id,
            {
              status: "Postponed",
            },
            { new: true }
          )
      )
    );
    if (!setPreparingToPostponed) return;

    //todo 5. Yg lolos dari todo 4, orderId nya di pull dr arr UserAuth.order, orderBagasiId nya di pull from arr User.orderBagasiId
    const removeOrderID = await Promise.all(
      setPreparingToPostponed.map(
        async (order) =>
          await UserAuth.findByIdAndUpdate(
            order.owner._id,
            {
              $pull: {
                order: { $in: [order._id] },
                orderBagasiId: { $in: [order.bagasi._id] },
              },
            },
            { new: true }
          )
      )
    );
    if (!removeOrderID) return;

    console.log(
      `successfully executing nodeSchedule: setFullOrderPreparingToPostponed, at: ${new Date()}`
    );
  } catch (error) {
    console.log(err);
  }
};

//! Execute Daily
//* CASE 3b. h-1 waktuBerangkat Bagasi, Order 'Preparing' to 'Postponed', pull id Order from User, pull id orderBagasi from arr User.orderBagasiId,  daily
const setLateOrderPreparingToPostponed = async () => {
  try {
    //todo 1. Find Order 'Preparing'
    const ordersPreparing = await Order.find({ status: "Preparing" });
    if (!ordersPreparing) return;

    //todo 2. Loop hasil dari todo 1, dlm loop tsb di filter, dgn comparation antara today vs waktuBerangkat Bagasi (25hours) h-1 waktuBerangkat
    let filterOrders = ordersPreparing.filter(
      (order) => today.getTime() >= order.waktuBerangkat.getTime() - 90000000
    );
    if (filterOrders.length == 0) return;

    //todo 3. Yg lolos dari todo 2, ganti status dari 'Preparing' ke 'Postponed'
    const setPreparingToPostponed = await Promise.all(
      filterOrders.map(
        async (order) =>
          await Order.findByIdAndUpdate(
            order._doc._id,
            {
              status: "Postponed",
            },
            { new: true }
          )
      )
    );
    if (!setPreparingToPostponed) return;

    //todo 4. Yg lolos dari todo 3, orderId nya di pull dr arr UserAuth.order, id orderBagasiId nya di pull from arr User.orderBagasiId,  daily
    const removeOrderID = await Promise.all(
      setPreparingToPostponed.map(
        async (order) =>
          await UserAuth.findByIdAndUpdate(
            order.owner._id,
            {
              $pull: {
                order: { $in: [order._id] },
                orderBagasiId: { $in: [order.bagasi._id] },
              },
            },
            { new: true }
          )
      )
    );
    if (!removeOrderID) return;

    console.log(
      `successfully executing nodeSchedule: setLateOrderPreparingToPostponed, at: ${new Date()}`
    );
  } catch (err) {
    console.log(err);
  }
};

//! Execute Daily
//* CASE 4. h+3 waktuTiba Bagasi, Order 'Ready' to 'Delivered', pull id Order from arr User.order, pull id orderBagasi from arr User.orderBagasiId,  daily
const setOrderReadyToDelivered = async () => {
  try {
    //todo 1. Find Order 'Ready'
    const ordersReady = await Order.find({ status: "Ready" });
    if (!ordersReady) return;

    //todo 2. Menambahkan waktuTiba ke dlm ordersDelivered dari Bagasi reference Order tsb
    // const ordersWithWaktuTiba = await Promise.all(
    //   ordersReady.map(async (order) => ({
    //     ...order,
    //     waktuTiba: (await Bagasi.findById(order.bagasi._id)).waktuTiba,
    //   }))
    // );

    //todo 3. Loop hasil dari todo 2, dlm loop tsb di filter, dgn comparation antara today vs waktuTiba Bagasi (h+3 waktuTiba)
    const filterOrders = ordersReady.filter(
      (order) => today.getTime() >= order.waktuTiba.getTime() + 259200000
    );
    if (filterOrders.length == 0) return;

    //todo 4. Yg lolos dari todo 3, ganti status dari 'Ready' ke 'Delivered'
    const setReadyToDelivered = await Promise.all(
      filterOrders.map(
        async (order) =>
          await Order.findByIdAndUpdate(
            //Perhatikan ini nama id nya ada .doc._id krn document mongo kita manipulate di todo 2, jd struktur document nya otomatis berubah, tdk sama lg dgn struktur dokumen mongo yg biasanya.
            order._doc._id,
            { status: "Delivered" },
            { new: true }
          )
      )
    );

    if (!setReadyToDelivered) return;

    //todo 5. Yg lolos dari todo 4, orderId nya di pull dr UserAuth.order, id orderBagasi nya di pull from arr User.orderBagasiId,  daily
    const removeOrderID = await Promise.all(
      setReadyToDelivered.map(
        async (order) =>
          await UserAuth.findByIdAndUpdate(
            order.owner._id,
            {
              $pull: {
                order: { $in: [order._id] },
                orderBagasiId: { $in: [order.bagasi._id] },
              },
            },
            { new: true }
          )
      )
    );

    if (!removeOrderID) return;

    console.log(
      `successfully executing nodeSchedule: setOrderReadyToDelivered, at: ${new Date()}`
    );
  } catch (err) {
    console.log(err);
  }
};

//! Execute Monthly
//* CASE 5. Bagasi 'Unloaded dan Bagasi 'Canceled', active true ke active false, not pull id, monthly
const setBagasiToFalse = async () => {
  try {
    //todo 1. scan Bagasi.status yg 'Unloaded' dan 'Canceled'.
    const statusUnloadAndCancel = await Bagasi.find({
      $or: [{ status: "Unloaded" }, { status: "Canceled" }],
    });
    if (!statusUnloadAndCancel) return;

    //todo 2. loop Bagasi yang lolos kodisional todo 2, di loop ini ganti status nya dari active ke false
    const setBagasiActiveToFalse = await Promise.all(
      statusUnloadAndCancel.map(
        async (el) =>
          await Bagasi.findByIdAndUpdate(
            el._id,
            {
              active: false,
            },
            { new: true, runValidators: true }
          )
      )
    );

    if (!setBagasiActiveToFalse) return;

    console.log(
      `successfully executing nodeSchedule: setBagasiToFalse, at: ${new Date()}`
    );
  } catch (err) {
    console.log(err);
  }
};

//! Execute Monthly
//* CASE 6. Order 'Delivered' dan Order 'Postponed', active true ke active false, not pull id, monthly
const setOrderToFalse = async () => {
  try {
    //todo 1. scan Order.status yg 'Delivered' dan 'Postponed'.
    const statusDeliveredAndPostponed = await Order.find({
      $or: [{ status: "Delivered" }, { status: "Postponed" }],
    });
    if (!statusDeliveredAndPostponed) return;

    //todo 2. loop Order yang lolos kodisional todo 2, di loop ini ganti status nya dari active ke false
    const setOrderActiveToFalse = await Promise.all(
      statusDeliveredAndPostponed.map(async (el) => {
        await Order.findByIdAndUpdate(
          el._id,
          { active: false },
          {
            new: true,
            runValidators: true,
          }
        );
      })
    );

    if (!setOrderActiveToFalse) return;

    console.log(
      `successfully executing nodeSchedule: setOrderToFalse, at: ${new Date()}`
    );
  } catch (err) {
    console.log(err);
  }
};

//! ********************* JOB SCHEDULE ********************* //

//! Triggered EVERY MINUTE
const jobTesting = () => {
  schedule.scheduleJob("* * * * *", function () {
    // console.log("testing");
  });
};

//! Triggered DAILY “At 00:00.”
const jobDaily = () => {
  schedule.scheduleJob("0 0 * * *", function () {
    setBagasiScheduledToCanceled();
    setBagasiOpenedToClosed();
    setBagasiClosedToUnloaded();
    setFullOrderPreparingToPostponed();
    setLateOrderPreparingToPostponed();
    setOrderReadyToDelivered();
  });
};

//! Triggered Every 2 weeks Tgl 1 dan 15 tiap bulan
const jobEvery2Weeks = () => {
  schedule.scheduleJob("30 1 1,15 * *", function () {});
};

//! Triggered MONTHLY “At 00:00 on day-of-month 1.”
const jobMonthly = () => {
  schedule.scheduleJob("0 0 1 * *", function () {
    setBagasiToFalse();
    setOrderToFalse();
  });
};

exports.startJob = () => {
  // jobTesting();
  jobDaily();
  // jobEvery2Weeks();
  jobMonthly();
};
