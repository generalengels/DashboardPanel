using Microsoft.AspNetCore.Mvc;

namespace DashboardPanel.Controllers
{
    public class CouponController : Controller
    {
        [HttpGet("~/coupons", Name = "Coupon ")]
        public IActionResult Index()
        {
            return View();
        }

        [HttpGet("~/CouponDetail", Name = "CouponDetail ")]
        public IActionResult CouponDetail()
        {
            return View();
        }
    }
}
