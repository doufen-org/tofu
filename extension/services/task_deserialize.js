import Task from "./Task.js";

// 确保正确导入所有子类
import Annotation from "../tasks/annotation.js";
import Blacklist from "../tasks/blacklist.js";
import Board from "../tasks/board.js";
import Doulist from "../tasks/doulist.js";
import Doumail from "../tasks/doumail.js";
import Files from "../tasks/files.js";
import Follower from "../tasks/follower.js";
import Following from "../tasks/following.js";
import Interest from "../tasks/interest.js";
import Mock from "../tasks/mock.js";
import Note from "../tasks/note.js";
import Photo from "../tasks/photo.js";
import Review from "../tasks/review.js";
import Status from "../tasks/status.js";

import MigrateAnnotation from "../tasks/migrate/annotation.js";
import MigrateBlacklist from "../tasks/migrate/blacklist.js";
import MigrateInterest from "../tasks/migrate/interest.js";
import MigrateNote from "../tasks/migrate/note.js";
import MigrateReview from "../tasks/migrate/review.js";
import Follow from "../tasks/migrate/follow.js";

export function taskFromJSON(json, fetch, logger, storage) {
    // 维护一个子类映射
    const taskClasses = {
        Annotation: Annotation,
        Blacklist: Blacklist,
        Board: Board,
        Doulist: Doulist,
        Doumail: Doumail,
        Files: Files,
        Follower: Follower,
        Following: Following,
        Interest: Interest,
        Mock: Mock,
        Note: Note,
        Photo: Photo,
        Review: Review,
        Status: Status,
        MigrateAnnotation: MigrateAnnotation,
        MigrateBlacklist: MigrateBlacklist,
        MigrateInterest: MigrateInterest,
        MigrateNote: MigrateNote,
        MigrateReview: MigrateReview,
        Follow: Follow
    };

    const TaskClass = taskClasses[json.taskType] || Task; // 找到正确的类，默认是 Task
    const task = new TaskClass(); // 用子类实例化
    task.jobId = json.jobId;
    task.session = json.session;
    task.targetUser = json.targetUser;
    task.isOtherUser = json.isOtherUser;
    task.total = json.total;
    task.completion = json.completion;

    // 重新初始化不可序列化的成员变量
    task.fetch = fetch;
    task.logger = logger;
    task.parseHTML = Task.parseHTML;
    task.storage = storage;

    return task;
}