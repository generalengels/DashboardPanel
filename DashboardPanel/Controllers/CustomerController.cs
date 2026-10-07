using Microsoft.AspNetCore.Mvc;

namespace DashboardPanel.Controllers
{
    public class CustomerController : Controller
    {
        [HttpGet("~/customers", Name = "Customers")]
        public IActionResult Index()
        {
            return View();
        }
    }
}
