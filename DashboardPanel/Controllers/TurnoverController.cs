using Microsoft.AspNetCore.Mvc;

namespace DashboardPanel.Controllers
{
    public class TurnoverController : Controller
    {
        [HttpGet("~/turnover", Name = "Turnover")]
        public IActionResult Index()
        {
            return View();
        }
    }
}
