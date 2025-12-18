<script setup>
import {computed, onMounted, ref} from 'vue';
import { Timeline } from 'vue-timeline-chart';
import 'vue-timeline-chart/style.css';
import axios from 'axios';
import { useRouter } from 'vue-router';
import authStore from '/src/stores/authStore.js';

const router = useRouter();

const props = defineProps({
  thesisId: {
    type: String,
    required: true
  }
});

const error = ref(null);
//Where the pulled data is stored
const timelineData = ref(null);
const fetchTimeline = async () => {
  try {
    console.log('Fetching timeline for thesis ID:', props.thesisId);
    
    // Fetch the timeline using the thesis ID
    const response = await axios.get(`/api/v1/timeline/view/byThesisId/${props.thesisId}`);
    
    if (!response.data) {
      console.error('No timeline data returned for thesis ID:', props.thesisId);
      error.value = 'No timeline data available';
      return;
    }
    
    timelineData.value = response.data;
    console.log('Timeline data loaded:', timelineData.value);
    
    // After data is loaded, process it
    if (timelineData.value) {
      processDataEntries();
    }
  } catch (err) {
    error.value = 'Failed to fetch timeline data';
    console.error('Error fetching timeline:', err);
  }
};

const groups = ref([]);
const items = ref([]);
const mouseHoverPosition = ref(null);
//Variable tracking which timeline Event was clicked
const selectedItem = ref(null);
//Variable tracking which JSON entry matches to the clicked timeline event
const matched_json_chapter = ref(null);
const matched_json_version = ref(null);
const infoCardRef = ref(null);

const markers = computed(() => {
  return [mouseHoverPosition.value ? {
    start: mouseHoverPosition.value,
    type: 'marker',
    id: 'mousehover',
  } : null].filter(Boolean);
});

function onMousemoveTimeline ({ time }) {
  mouseHoverPosition.value = time;
}
function onMouseleaveTimeline () {
  mouseHoverPosition.value = null;
}

//Goes through acquired JSON and using pushItem and pushGroup, populates Vue Timeline Chart arrays. Is booted on app mount.
function processDataEntries() {
  if (!timelineData.value) {
    console.error('Timeline data is not available');
    error.value = 'Timeline data is not available';
    return;
  }

  const thesis_supervisor_id = timelineData.value.supervisor_user_data_id;
  //Test Entry to test supervisor status. Other timeline entries do not react to it, as they react strictly to entries in timelineData
  //pushItem(items, 999, 28, 1756737432000, 'Testname', 'Testcomment', 'Testtally', 'status-supervisor')
  timelineData.value.chapters.forEach(chapter => {
    const author_id = chapter.author.user_data_id;
    const author_name = `${chapter.author.user_data_first_name} ${chapter.author.user_data_last_name}`;
    let was_reviewed = null;
    if (!groupExistsAlready(groups, author_id)) {
      pushGroup(groups, author_id, author_name);
    }

    [...chapter.versions].reverse().forEach(version => {
      if (!itemExistsAlready(items, version.id, Date.parse(version.upload_date_time))) {
        let status = null;
        let score = null;
        if (isSupervisor(thesis_supervisor_id, version.uploader.user_data_id)) {
          was_reviewed = 1;
          status = 'status-supervisor';
          score = version.checklist_tally.resolved + '/' + version.checklist_tally.total;
          console.log('Score is:', score);

        }
        else {
          if (was_reviewed === 1) {
            status = 'status-student-reviewed';
          }
          else {
            status = 'status-student-pending';
          }
        }
        pushItem(
            items,
            version.id,
            author_id,
            Date.parse(version.upload_date_time),
            `${version.uploader.user_data_first_name} ${version.uploader.user_data_last_name}`,
            version.supervisor_comment,
            score,
            status
        );
      }
    });
  });
}
//FIX: This should be passing a version object, instead of two IDs
function isSupervisor(supervisor_id, version_uploader_id){
  if (supervisor_id === version_uploader_id) {
    console.log('This is a Supervisor');
    return 'true';
  }
}

//FIX: This should be two separate functions, not a two-in-one
function matchChapterAndVersion(entry_id, entry_date) {
  for (const chapter of timelineData.value.chapters) {
    console.log('Chapter being checked:', chapter);
    const version = chapter.versions.find(version =>
        new Date(version.upload_date_time).getTime() === entry_date &&
        version.id === entry_id
    );

    if (version) {
      matched_json_chapter.value = {...chapter};
      matched_json_version.value = {...version};
      break;
    }
  }

  console.log('Final match:', {
    chapter: matched_json_chapter.value,
    version: matched_json_version.value
  });
}
//Populates the Vue Timeline Chart's 'items' array with entries
function pushItem(items_array_ref, version_id, group_id, date, uploadedBy, comment, score, status) {
  const newItem = {
    id: version_id,
    group: group_id,
    type: 'point',
    start: date,
    uploadedBy: uploadedBy,
    comment: comment,
    tally: score,
    className: status
  };
  console.log('Adding item:', newItem);
  items_array_ref.value.push(newItem);
}
function itemExistsAlready(array_to_check, item_id, item_date){
  return array_to_check.value.some(item => item.id === `${item_id}-${item_date}`);
}
//Populates the Vue Timeline Chart's 'group' array with entries
function pushGroup (group_array_ref, student_id, name_of_student){
  group_array_ref.value.push({
    id: student_id,
    label: name_of_student
  });
  console.log('Adding group:', {
    id: student_id,
    label: name_of_student
  });
}
function groupExistsAlready(array_to_check, item_id){
  return array_to_check.value.some(item => item.id === `${item_id}`);
}
//Function called when clicking a timeline event. Goes through JSON to find matching entry and saves it to variable matched_json_entry
function displayItemInformation(event) {
  // Check if timeline event exists and if it has data
  if (event && event.item) {
    selectedItem.value = event.item;
    console.log('Event item is: ', event.item);
    console.log('Event item start is: ', event.item.start);
    //Find JSON entry which matches timeline event
    matchChapterAndVersion(event.item.id, event.item.start);
  }
}

function goBack() {
  router.push('/groups-panel');
}


/* discarded functions kept for possible future use
//Discarded because I made adding items start with the most recent entry rather that the oldest. This made checking the status of future versions obsolete.
function assignStatus(supervisor_id, version_uploader_id, version_entry_id, version_upload_date) {
  if (isSupervisor(supervisor_id, version_uploader_id)) {return 'status-supervisor';}
  else {
    console.log('Not a supervisor. The date I am looking for is: ', version_upload_date);
    return wasReviewed(version_entry_id, version_upload_date);
  }
}
//Made for the function above
function wasReviewed(version_entry_id, version_upload_date) {
  const supervisor_id = timelineData.value.supervisor_user_data_id;
  const timestamp = Date.parse(version_upload_date);
  console.log('This is the date I am trying to find:', timestamp);
  matchChapterAndVersion(version_entry_id, timestamp);
  if (matched_json_chapter.value && matched_json_version.value) {
    console.log('I FOUND YOU, FAKER',matched_json_chapter.value, matched_json_version.value);
    return 'status-student-reviewed';
  }
  else {
    return 'status-student-pending';
  }
}
*/


onMounted(async () => {
  await fetchTimeline();
  // processDataEntries is now called inside fetchTimeline after data is loaded
});
</script>

<template>
  <div class="wrapper">
    <!-- Back button for promoters only - separate container -->
    <div v-if="authStore.isPromoter" class="back-btn-container">
      <button class="back-btn-external" @click="goBack">
        <span>←</span>
        Powrót
      </button>
    </div>
    
    <div class="card timeline-card">
      <Timeline
          class="timeline"
          :groups="groups"
          :items="items"
          :viewportMin="new Date(`${new Date().getFullYear()}-01-01`).getTime()"
          :viewportMax="new Date(`${new Date().getFullYear()}-12-31`).getTime()"
          :markers="markers"
          @mousemoveTimeline="onMousemoveTimeline"
          @mouseleaveTimeline="onMouseleaveTimeline"
          @click="displayItemInformation"
      >
        <template #marker="{item}">
          <div class="marker-content">
            {{ new Date(item.start).toLocaleString() }}
          </div>
        </template>
        <template #item="{item}">
          <div class="tally-content">
            {{ item.tally}}
          </div>
        </template>
      </Timeline>
    </div>
  
  <div class="info-card" v-if="matched_json_chapter && matched_json_version">
    <div class="selected-item">
      <p><strong>Selected Chapter:</strong> {{ matched_json_chapter.name }}</p>
      <p><strong>Author:</strong> {{ matched_json_chapter.author.user_data_first_name }} {{ matched_json_chapter.author.user_data_last_name }}</p>
      <p><strong>Email:</strong> {{ matched_json_chapter.author.user_data_email }}</p>

        <p><strong>Version Details:</strong></p>
        <div>
          <p><strong>Uploaded on:</strong> {{ new Date(new Date(matched_json_version.upload_date_time).getTime() + 7200000).toISOString().replace('T', ' ').split('.')[0]  }}</p>
          <p><strong>Uploaded by:</strong> {{ matched_json_version.uploader.user_data_first_name }} {{ matched_json_version.uploader.user_data_last_name }}</p>
          <p v-if="matched_json_version.uploader.user_data_id == timelineData.supervisor_user_data_id"><strong>Checklist Tally:</strong> {{ matched_json_version.checklist_tally.resolved + '/' + matched_json_version.checklist_tally.total }}</p>
          <p v-if="matched_json_version.supervisor_comment  !== 'n/a'"><strong>Supervisor Comment:</strong> {{ matched_json_version.supervisor_comment }}</p>
          <p v-if="matched_json_version.file_link"><a :href="matched_json_version.file_link" target="_blank">File Link</a></p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped src="../css/Timeline.css"></style>