-- MySQL dump 10.13  Distrib 8.0.36, for Linux (x86_64)
--
-- Host: localhost    Database: shop
-- ------------------------------------------------------
-- Server version	8.0.36

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `vip` tinyint(1) NOT NULL DEFAULT '0',
  `joined` datetime DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,'Test Customer One',1,'2023-01-15 09:30:00','likes \'quotes\'; and semicolons'),(2,'測試顧客',0,'0000-00-00 00:00:00',NULL),(3,'Sample Person',0,NULL,'line1\nline2');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` bigint NOT NULL,
  `customer_id` int unsigned NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `status` enum('new','paid','shipped') NOT NULL DEFAULT 'new',
  `token` varbinary(4) DEFAULT NULL,
  `flags` bit(1) DEFAULT b'0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `orders` WRITE;
INSERT INTO `orders` VALUES (100,1,250.00,'paid',0x0A0B0C0D,b'1'),(101,2,19.99,'new',NULL,b'0');
INSERT INTO `orders` VALUES (102,1,'not a number','shipped',NULL,b'0'),
(103,3,5.50,'shipped',_binary 'ab',b'1');
UNLOCK TABLES;

DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `orders_bi` BEFORE INSERT ON `orders` FOR EACH ROW BEGIN
  SET NEW.status = 'new';
END */;;
DELIMITER ;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
-- Dump completed on 2024-03-01 10:00:00
