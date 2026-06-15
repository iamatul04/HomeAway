const Listing = require("./models/listing");

module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.redirect("/login");
    }
    next();
};

module.exports.isOwner = async (req, res, next) => {
    let { id } = req.params;

    let listing = await Listing.findById(id);

    if (!listing.owner.equals(req.user._id)) {
        return res.redirect(`/listings/${id}`);
    }

    next();
};