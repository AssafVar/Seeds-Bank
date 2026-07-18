using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SeedsBank.Server.Models;

[Table("users")]
public class User
{
    [Key]
    [Column("userId")]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    public string UserId { get; set; } = null!;

    [Column("userName")]
    public string UserName { get; set; } = null!;

    [Column("email")]
    public string Email { get; set; } = null!;

    [Column("password")]
    public string Password { get; set; } = null!;

    [Column("isAdmin")]
    public bool IsAdmin { get; set; }
}
