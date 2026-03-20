<?php
// php/process_feedback.php

// 1. Import PHPMailer classes into the global namespace
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

// 2. Load the PHPMailer files manually
require 'PHPMailer/src/Exception.php';
require 'PHPMailer/src/PHPMailer.php';
require 'PHPMailer/src/SMTP.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    $name = htmlspecialchars($_POST['name']);
    $type = htmlspecialchars($_POST['type']);
    $message = htmlspecialchars($_POST['message']);
    
    if (empty($name)) { $name = "Alpha Tester"; }

    // Create a new PHPMailer instance
    $mail = new PHPMailer(true);

    try {
        // --- SMTP Server Settings ---
        $mail->isSMTP();                                            
        $mail->Host       = 'smtp.gmail.com';                     
        $mail->SMTPAuth   = true;                                   
        $mail->Username   = 'mccartisansmultimedia@gmail.com'; // Your Gmail     
        $mail->Password   = 'ixxucnshdojqnhwh'; // <-- PASTE YOUR APP PASSWORD HERE (No spaces)
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;            
        $mail->Port       = 587;                                    

        // --- Email Headers ---
        // Who is it from? (Your app)
        $mail->setFrom('mccartisansmultimedia@gmail.com', 'Photobook App'); 
        // Who is receiving it? (You!)
        $mail->addAddress('mccartisansmultimedia@gmail.com');     

        // --- Email Content ---
        $mail->isHTML(false); // We are sending plain text
        $mail->Subject = "Alpha Feedback: " . $type;
        
        $email_body = "You have received new feedback from the Photobook Alpha Test.\n\n";
        $email_body .= "From: " . $name . "\n";
        $email_body .= "Type: " . $type . "\n";
        $email_body .= "Message:\n" . $message . "\n";
        
        $mail->Body = $email_body;

        // Send the email!
        $mail->send();
        
        echo "<div style='font-family: Roboto, sans-serif; text-align: center; margin-top: 50px;'>";
        echo "<h2 style='color: #de222a;'>Thank you for your feedback!</h2>";
        echo "<p>Your suggestions help us make the editor better.</p>";
        echo "<a href='../index.html' style='color: #3a3a3a;'>Return to Editor</a>";
        echo "</div>";
        
    } catch (Exception $e) {
        echo "Message could not be sent. Mailer Error: {$mail->ErrorInfo}";
    }

} else {
    echo "Access denied.";
}
?>