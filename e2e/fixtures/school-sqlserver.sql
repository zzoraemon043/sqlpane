USE [School]
GO
/****** Object:  Table [dbo].[Students]    Script Date: 2024/3/1 10:00:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Students](
	[StudentID] [int] IDENTITY(1,1) NOT NULL,
	[Name] [nvarchar](50) NOT NULL,
	[Email] [nvarchar](max) NULL,
	[Active] [bit] NOT NULL,
	[Balance] [money] NULL,
	[Guid] [uniqueidentifier] NULL,
	[Enrolled] [datetime] NULL,
 CONSTRAINT [PK_Students] PRIMARY KEY CLUSTERED 
(
	[StudentID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
CREATE TABLE [dbo].[Courses](
	[CourseID] [int] NOT NULL,
	[Title] [nvarchar](100) NOT NULL,
	[Credits] [decimal](4, 1) NOT NULL,
	[Syllabus] [varbinary](max) NULL
) ON [PRIMARY]
GO
SET IDENTITY_INSERT [dbo].[Students] ON 
GO
INSERT [dbo].[Students] ([StudentID], [Name], [Email], [Active], [Balance], [Guid], [Enrolled]) VALUES (1, N'範例學生', N'student.one@example.com', 1, 100.5000, N'6f9619ff-8b86-d011-b42d-00c04fc964ff', CAST(N'2023-09-01T08:00:00.000' AS DateTime))
GO
INSERT [dbo].[Students] ([StudentID], [Name], [Email], [Active], [Balance], [Guid], [Enrolled]) VALUES (2, N'Test Learner', NULL, 0, NULL, NULL, CAST(N'2023-09-02T08:00:00.000' AS DateTime))
GO
INSERT [dbo].[Students] ([StudentID], [Name], [Email], [Active], [Balance], [Guid], [Enrolled]) VALUES (2, N'Duplicate Key', NULL, 0, NULL, NULL, NULL)
GO
SET IDENTITY_INSERT [dbo].[Students] OFF
GO
INSERT [dbo].[Courses] ([CourseID], [Title], [Credits], [Syllabus]) VALUES (10, N'C:\Intro ''Databases''', CAST(3.0 AS Decimal(4, 1)), 0x255044462D)
GO
INSERT [dbo].[Courses] ([CourseID], [Title], [Credits], [Syllabus]) VALUES (11, N'Statistics', CAST(4.5 AS Decimal(4, 1)), NULL)
GO
ALTER TABLE [dbo].[Students] ADD  CONSTRAINT [DF_Students_Active]  DEFAULT ((1)) FOR [Active]
GO
